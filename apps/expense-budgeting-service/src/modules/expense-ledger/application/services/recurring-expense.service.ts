import { createHash } from 'node:crypto';
import { IRecurringExpenseRepository } from "../../domain/repositories/recurring-expense.repository";
import { RecurringExpenseId } from "../../domain/value-objects/recurring-expense-id";
import {
  RecurringExpense,
  RecurringExpenseDTO,
  ExpenseTemplate,
} from "../../domain/entities/recurring-expense.entity";
import { RecurrenceFrequency } from "../../domain/enums/recurrence-frequency";
import { ExpenseService } from "./expense.service";
import { PaymentMethod } from "../../domain/enums/payment-method";
import {
  RecurringExpenseNotFoundError,
  UnauthorizedExpenseAccessError,
  TagNotFoundError,
  CategoryNotFoundError,
} from "../../domain/errors/expense.errors";
import { IUnitOfWork } from "../ports/unit-of-work.port";
import { ICategoryRepository } from "../../domain/repositories/category.repository";
import { CategoryId } from "../../domain/value-objects/category-id";
import { ITagRepository } from "../../domain/repositories/tag.repository";
import { TagId } from "../../domain/value-objects/tag-id";

export class RecurringExpenseService {
  constructor(
    private readonly recurringExpenseRepository: IRecurringExpenseRepository,
    private readonly expenseService: ExpenseService,
    private readonly unitOfWork: IUnitOfWork,
    private readonly categoryRepository?: ICategoryRepository,
    private readonly tagRepository?: ITagRepository,
  ) {}

  private generateOccurrenceExpenseId(recurringId: string, scheduledDate: Date): string {
    const dateStr = scheduledDate.toISOString().slice(0, 10);
    const hash = createHash('sha256')
      .update(`recurring:${recurringId}:${dateStr}`)
      .digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  }

  async createRecurringExpense(params: {
    workspaceId: string;
    userId: string;
    frequency: RecurrenceFrequency;
    interval: number;
    startDate: Date;
    endDate?: Date;
    template: ExpenseTemplate;
  }): Promise<RecurringExpenseDTO> {
    if (params.template.categoryId && this.categoryRepository) {
      let categoryIdVO: CategoryId | null = null;
      try {
        categoryIdVO = CategoryId.fromString(params.template.categoryId);
      } catch {
        throw new CategoryNotFoundError(params.template.categoryId, params.workspaceId);
      }
      const exists = await this.categoryRepository.exists(
        categoryIdVO,
        params.workspaceId
      );
      if (!exists) {
        throw new CategoryNotFoundError(params.template.categoryId, params.workspaceId);
      }
    }

    if (params.template.tagIds && params.template.tagIds.length > 0 && this.tagRepository) {
      for (const tagIdStr of params.template.tagIds) {
        let tagIdVO: TagId | null = null;
        try {
          tagIdVO = TagId.fromString(tagIdStr);
        } catch {
          throw new TagNotFoundError(tagIdStr, params.workspaceId);
        }
        const exists = await this.tagRepository.exists(tagIdVO, params.workspaceId);
        if (!exists) {
          throw new TagNotFoundError(tagIdStr, params.workspaceId);
        }
      }
    }

    const expense = RecurringExpense.create({
      workspaceId: params.workspaceId,
      userId: params.userId,
      frequency: params.frequency,
      interval: params.interval,
      startDate: params.startDate,
      endDate: params.endDate,
      template: params.template,
    });

    await this.recurringExpenseRepository.save(expense);
    return RecurringExpense.toDTO(expense);
  }

  async processDueExpenses(limit = 100, workspaceId?: string): Promise<number> {
    const now = new Date();
    let processedCount = 0;

    // Process expenses one at a time up to limit. Each iteration initiates a transaction
    // claiming the row via FOR UPDATE SKIP LOCKED, so PostgreSQL holds the row lock
    // until the transaction commits or rolls back.
    for (let i = 0; i < limit; i++) {
      let claimedAndProcessed = false;
      let rowClaimed = false;
      let conflictHandledElsewhere = false;
      let lastClaimedId: string | null = null;
      let lastWorkspaceId: string | null = null;

      try {
        claimedAndProcessed = await this.unitOfWork.execute(async () => {
          // 1. Atomically claim next due row under active transaction
          const recurring =
            await this.recurringExpenseRepository.claimNextDueExpense(
              now,
              workspaceId
            );

          // If no more rows are due (or all remaining rows are locked by concurrent workers), stop
          if (!recurring) {
            return false;
          }

          rowClaimed = true;
          lastClaimedId = recurring.id.getValue();
          lastWorkspaceId = recurring.workspaceId;

          const occurrenceExpenseId = this.generateOccurrenceExpenseId(
            recurring.id.getValue(),
            recurring.nextRunDate
          );

          // Check if an expense was already created for this occurrence (idempotency check)
          const existingExpense = await this.expenseService.getExpenseById(
            occurrenceExpenseId,
            recurring.workspaceId
          );

          if (existingExpense) {
            // Occurrence already exists; advance schedule and save to complete this recurrence
            recurring.markAsRun();
            await this.recurringExpenseRepository.save(recurring);
            return true;
          }

          // Validate template category if present
          let categoryId = recurring.template.categoryId;
          if (categoryId && this.categoryRepository) {
            let categoryIdVO: CategoryId | null = null;
            try {
              categoryIdVO = CategoryId.fromString(categoryId);
            } catch {
              // Invalid UUID format in template - cannot exist in database
              categoryId = undefined;
            }

            if (categoryIdVO) {
              // Check existence in DB. If database query fails, let infrastructure error propagate!
              const categoryExists = await this.categoryRepository.exists(
                categoryIdVO,
                recurring.workspaceId
              );
              if (!categoryExists) {
                categoryId = undefined;
              }
            }
          }

          // Validate template tags if present (gracefully filter tags that no longer exist)
          let tagIds: string[] | undefined = undefined;
          if (recurring.template.tagIds && recurring.template.tagIds.length > 0) {
            if (this.tagRepository) {
              const existingTags: string[] = [];
              for (const tagIdStr of recurring.template.tagIds) {
                let tagIdVO: TagId | null = null;
                try {
                  tagIdVO = TagId.fromString(tagIdStr);
                } catch {
                  // Invalid UUID format in template - skip
                }
                if (tagIdVO) {
                  const tagExists = await this.tagRepository.exists(
                    tagIdVO,
                    recurring.workspaceId
                  );
                  if (tagExists) {
                    existingTags.push(tagIdStr);
                  }
                }
              }
              tagIds = existingTags;
            } else {
              tagIds = recurring.template.tagIds;
            }
          }

          // Create the occurrence expense
          // Note: We do NOT swallow duplicate errors (P2002) inside this transaction.
          // In PostgreSQL, any SQL error aborts the transaction block (25P02).
          // If a concurrent collision occurs, letting the error bubble allows the UnitOfWork
          // to cleanly roll back this transaction before retrying in a fresh transaction.
          await this.expenseService.createExpense({
            id: occurrenceExpenseId,
            workspaceId: recurring.workspaceId,
            userId: recurring.userId,
            title: recurring.template.title,
            description: recurring.template.description,
            amount: recurring.template.amount,
            currency: recurring.template.currency,
            expenseDate: recurring.nextRunDate,
            categoryId,
            merchant: recurring.template.merchant,
            paymentMethod:
              (recurring.template.paymentMethod as PaymentMethod) ||
              PaymentMethod.CASH,
            isReimbursable: recurring.template.isReimbursable || false,
            tagIds,
          });

          // Advance the schedule and save within the same transaction
          recurring.markAsRun();
          await this.recurringExpenseRepository.save(recurring);
          return true;
        });
      } catch (error: unknown) {
        // If a duplicate occurrence error occurs (e.g. concurrent creation race or P2002),
        // the original transaction has been cleanly rolled back by UnitOfWork.
        // Reacquire the specific recurring row under FOR UPDATE SKIP LOCKED in a fresh transaction
        // to safely advance the schedule without writing stale state or double-processing.
        const errObj = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : null;
        const errCode = typeof errObj?.code === 'string' ? errObj.code : undefined;
        const errName = typeof errObj?.name === 'string' ? errObj.name : undefined;
        const errMessage = typeof errObj?.message === 'string' ? errObj.message : undefined;
        const errStatusCode = typeof errObj?.statusCode === 'number' ? errObj.statusCode : undefined;

        if (
          errCode === 'P2002' ||
          errMessage?.includes('already exists') ||
          errName === 'DuplicateExpenseError'
        ) {
          if (lastClaimedId && lastWorkspaceId) {
            const recovered = await this.retryAdvanceAfterConflict(
              now,
              lastClaimedId,
              lastWorkspaceId
            );
            if (recovered) {
              claimedAndProcessed = true;
            } else {
              conflictHandledElsewhere = true;
            }
          } else {
            conflictHandledElsewhere = true;
          }
        } else if (
          errName?.includes('NotFoundError') ||
          errName?.includes('ValidationError') ||
          errName?.includes('Invalid') ||
          errCode === 'TAG_NOT_FOUND' ||
          errCode === 'CATEGORY_NOT_FOUND' ||
          errStatusCode === 400 ||
          errStatusCode === 404
        ) {
          // Domain validation failure on an individual template: advance schedule so it does not block the entire batch
          console.warn(`Skipping invalid recurring expense occurrence for template ${lastClaimedId}: ${errMessage || String(error)}`);
          if (lastClaimedId && lastWorkspaceId) {
            await this.advanceScheduleForFailedTemplate(
              now,
              lastClaimedId,
              lastWorkspaceId,
              errMessage || String(error)
            );
          }
          conflictHandledElsewhere = true;
        } else {
          console.error('Failed to process recurring expense transaction:', error);
          throw error;
        }
      }

      if (!rowClaimed) {
        // No more due rows available to claim in the database (or all due rows are locked)
        break;
      }

      if (conflictHandledElsewhere) {
        // The conflicted row was handled by another concurrent worker or could not be verified.
        // Do not increment processedCount, but continue normal claiming for any other due rows in the batch.
        continue;
      }

      if (claimedAndProcessed) {
        processedCount++;
      }
    }

    return processedCount;
  }

  /**
   * Retries claiming and advancing the schedule in a fresh transaction after a concurrent
   * conflict (e.g. PostgreSQL P2002) rolled back the original transaction.
   * Re-acquires the exact row with FOR UPDATE SKIP LOCKED to prevent stale state overwrites
   * or double-processing if another concurrent worker claimed or advanced it in the interim.
   */
  private async retryAdvanceAfterConflict(
    now: Date,
    recurringId: string,
    workspaceId: string
  ): Promise<boolean> {
    return await this.unitOfWork.execute(async () => {
      // Re-claim the exact recurring row using FOR UPDATE SKIP LOCKED.
      // If another worker currently holds the lock, or has already advanced nextRunDate,
      // claimById returns null, preventing stale writes and double processing.
      const recurring = await this.recurringExpenseRepository.claimById(
        RecurringExpenseId.fromString(recurringId),
        workspaceId,
        now
      );

      if (!recurring) {
        return false;
      }

      const occurrenceExpenseId = this.generateOccurrenceExpenseId(
        recurring.id.getValue(),
        recurring.nextRunDate
      );

      const existingExpense = await this.expenseService.getExpenseById(
        occurrenceExpenseId,
        recurring.workspaceId
      );

      if (existingExpense) {
        recurring.markAsRun();
        await this.recurringExpenseRepository.save(recurring);
        return true;
      }

      // If the occurrence cannot be verified, do NOT advance the schedule.
      // Advancing when existingExpense is absent would silently skip that occurrence.
      return false;
    });
  }

  /**
   * Advances the schedule in a fresh transaction when a recurring template encounters an
   * unrecoverable domain or dependency error (e.g., deleted tags, deleted category, invalid parameters).
   * Re-acquires the row using FOR UPDATE SKIP LOCKED, advances nextRunDate via markAsRun(),
   * and saves the updated schedule to prevent the invalid template from blocking the recurring batch.
   */
  private async advanceScheduleForFailedTemplate(
    now: Date,
    recurringId: string,
    workspaceId: string,
    reason: string
  ): Promise<boolean> {
    return await this.unitOfWork.execute(async () => {
      const recurring = await this.recurringExpenseRepository.claimById(
        RecurringExpenseId.fromString(recurringId),
        workspaceId,
        now
      );

      if (!recurring) {
        return false;
      }

      console.warn(
        `[RecurringExpenseService] Recording failure for template ${recurringId} in workspace ${workspaceId} (consecutive: ${recurring.consecutiveFailures + 1}): ${reason}`
      );

      // Use recordFailure() instead of markAsRun() to:
      // 1. Persist the failure reason and timestamp for user visibility
      // 2. Increment consecutiveFailures counter
      // 3. Auto-pause after MAX_CONSECUTIVE_FAILURES
      recurring.recordFailure(reason);
      await this.recurringExpenseRepository.save(recurring);
      return true;
    });
  }

  async pauseRecurringExpense(
    id: string,
    workspaceId: string,
    userId: string
  ): Promise<void> {
    const expense = await this.recurringExpenseRepository.findById(
      RecurringExpenseId.fromString(id),
      workspaceId
    );
    if (!expense) throw new RecurringExpenseNotFoundError(id);

    if (expense.userId !== userId) {
      throw new UnauthorizedExpenseAccessError(id, userId, 'pause');
    }

    expense.pause();
    await this.recurringExpenseRepository.save(expense);
  }

  async resumeRecurringExpense(
    id: string,
    workspaceId: string,
    userId: string
  ): Promise<void> {
    const expense = await this.recurringExpenseRepository.findById(
      RecurringExpenseId.fromString(id),
      workspaceId
    );
    if (!expense) throw new RecurringExpenseNotFoundError(id);

    if (expense.userId !== userId) {
      throw new UnauthorizedExpenseAccessError(id, userId, 'resume');
    }

    expense.resume();
    await this.recurringExpenseRepository.save(expense);
  }

  async stopRecurringExpense(
    id: string,
    workspaceId: string,
    userId: string
  ): Promise<void> {
    const expense = await this.recurringExpenseRepository.findById(
      RecurringExpenseId.fromString(id),
      workspaceId
    );
    if (!expense) throw new RecurringExpenseNotFoundError(id);

    if (expense.userId !== userId) {
      throw new UnauthorizedExpenseAccessError(id, userId, 'stop');
    }

    expense.stop();
    await this.recurringExpenseRepository.save(expense);
  }

  async getRecurringExpense(
    id: string,
    workspaceId: string
  ): Promise<RecurringExpense | null> {
    return this.recurringExpenseRepository.findById(
      RecurringExpenseId.fromString(id),
      workspaceId
    );
  }
}
