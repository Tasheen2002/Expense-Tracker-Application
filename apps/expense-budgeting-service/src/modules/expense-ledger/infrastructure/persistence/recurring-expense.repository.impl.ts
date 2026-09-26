import {
  PrismaClient,
  Prisma,
  RecurrenceFrequency as PrismaRecurrenceFrequency,
  RecurrenceStatus as PrismaRecurrenceStatus,
} from "@prisma/client";
import { IRecurringExpenseRepository } from "../../domain/repositories/recurring-expense.repository";
import {
  RecurringExpense,
  ExpenseTemplate,
} from "../../domain/entities/recurring-expense.entity";
import { RecurringExpenseId } from "../../domain/value-objects/recurring-expense-id";
import { RecurrenceFrequency } from "../../domain/enums/recurrence-frequency";
import { RecurrenceStatus } from "../../domain/enums/recurrence-status";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';

interface RecurringExpensePersistenceData {
  id: string;
  workspaceId: string;
  userId: string;
  frequency: string;
  interval: number;
  startDate: Date;
  endDate?: Date | null;
  nextRunDate: Date;
  status: string;
  template: unknown;
  consecutiveFailures?: number | null;
  lastFailureReason?: string | null;
  lastFailureAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toPrismaFrequency(freq: RecurrenceFrequency): PrismaRecurrenceFrequency {
  switch (freq) {
    case RecurrenceFrequency.DAILY:
      return PrismaRecurrenceFrequency.DAILY;
    case RecurrenceFrequency.WEEKLY:
      return PrismaRecurrenceFrequency.WEEKLY;
    case RecurrenceFrequency.MONTHLY:
      return PrismaRecurrenceFrequency.MONTHLY;
    case RecurrenceFrequency.YEARLY:
      return PrismaRecurrenceFrequency.YEARLY;
  }
}

function toDomainFrequency(freq: string): RecurrenceFrequency {
  switch (freq) {
    case 'DAILY':
      return RecurrenceFrequency.DAILY;
    case 'WEEKLY':
      return RecurrenceFrequency.WEEKLY;
    case 'MONTHLY':
      return RecurrenceFrequency.MONTHLY;
    case 'YEARLY':
      return RecurrenceFrequency.YEARLY;
    default:
      return RecurrenceFrequency.MONTHLY;
  }
}

function toPrismaStatus(status: RecurrenceStatus): PrismaRecurrenceStatus {
  switch (status) {
    case RecurrenceStatus.ACTIVE:
      return PrismaRecurrenceStatus.ACTIVE;
    case RecurrenceStatus.PAUSED:
      return PrismaRecurrenceStatus.PAUSED;
    case RecurrenceStatus.COMPLETED:
      return PrismaRecurrenceStatus.COMPLETED;
  }
}

function toDomainStatus(status: string): RecurrenceStatus {
  switch (status) {
    case 'ACTIVE':
      return RecurrenceStatus.ACTIVE;
    case 'PAUSED':
    case 'STOPPED':
      return RecurrenceStatus.PAUSED;
    case 'COMPLETED':
      return RecurrenceStatus.COMPLETED;
    default:
      return RecurrenceStatus.PAUSED;
  }
}

function templateToJson(template: ExpenseTemplate): Prisma.InputJsonObject {
  return {
    title: template.title,
    ...(template.description !== undefined && { description: template.description }),
    amount: template.amount,
    currency: template.currency,
    ...(template.categoryId !== undefined && { categoryId: template.categoryId }),
    ...(template.merchant !== undefined && { merchant: template.merchant }),
    ...(template.paymentMethod !== undefined && { paymentMethod: template.paymentMethod }),
    ...(template.isReimbursable !== undefined && { isReimbursable: template.isReimbursable }),
    ...(template.tagIds !== undefined && { tagIds: template.tagIds }),
  };
}

function jsonToTemplate(raw: unknown): ExpenseTemplate {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const data = raw as Record<string, unknown>;
    return {
      title: typeof data.title === 'string' ? data.title : '',
      ...(typeof data.description === 'string' && { description: data.description }),
      amount: typeof data.amount === 'number' ? data.amount : 0,
      currency: typeof data.currency === 'string' ? data.currency : 'USD',
      ...(typeof data.categoryId === 'string' && { categoryId: data.categoryId }),
      ...(typeof data.merchant === 'string' && { merchant: data.merchant }),
      ...(typeof data.paymentMethod === 'string' && { paymentMethod: data.paymentMethod }),
      ...(typeof data.isReimbursable === 'boolean' && { isReimbursable: data.isReimbursable }),
      ...(Array.isArray(data.tagIds) && { tagIds: data.tagIds.map(String) }),
    };
  }
  return {
    title: '',
    amount: 0,
    currency: 'USD',
  };
}

export class PrismaRecurringExpenseRepository
  extends PrismaRepository<RecurringExpense>
  implements IRecurringExpenseRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(expense: RecurringExpense): Promise<void> {
    await this.runInTransaction(async (tx) => {
      await tx.recurringExpense.upsert({
        where: { id: expense.id.getValue() },
        update: {
          frequency: toPrismaFrequency(expense.frequency),
          interval: expense.interval,
          startDate: expense.startDate,
          endDate: expense.endDate,
          nextRunDate: expense.nextRunDate,
          status: toPrismaStatus(expense.status),
          template: templateToJson(expense.template),
          consecutiveFailures: expense.consecutiveFailures,
          lastFailureReason: expense.lastFailureReason ?? null,
          lastFailureAt: expense.lastFailureAt ?? null,
          updatedAt: expense.updatedAt,
        },
        create: {
          id: expense.id.getValue(),
          workspaceId: expense.workspaceId,
          userId: expense.userId,
          frequency: toPrismaFrequency(expense.frequency),
          interval: expense.interval,
          startDate: expense.startDate,
          endDate: expense.endDate,
          nextRunDate: expense.nextRunDate,
          status: toPrismaStatus(expense.status),
          template: templateToJson(expense.template),
          consecutiveFailures: expense.consecutiveFailures,
          lastFailureReason: expense.lastFailureReason ?? null,
          lastFailureAt: expense.lastFailureAt ?? null,
          createdAt: expense.createdAt,
          updatedAt: expense.updatedAt,
        },
      });

      await this.dispatchEvents(expense, tx);
    });
  }

  async findById(
    id: RecurringExpenseId,
    workspaceId: string,
  ): Promise<RecurringExpense | null> {
    const data = await this.prisma.recurringExpense.findFirst({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    });

    if (!data) return null;

    return this.toDomain(data);
  }

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<RecurringExpense>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.recurringExpense,
      {
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
      },
      (expense) => this.toDomain(expense),
      options,
    );
  }

  /**
   * Worker-level atomic batch claim: locks and retrieves the earliest due recurring expense
   * using PostgreSQL FOR UPDATE SKIP LOCKED within an active transaction.
   * Returns null if no eligible row is found; never falls back to unlocked query.
   */
  async claimNextDueExpense(
    beforeDate: Date,
    workspaceId?: string
  ): Promise<RecurringExpense | null> {
    const client = this.prisma;
    if (typeof client.$queryRaw !== 'function') {
      throw new Error(
        'PrismaClient instance does not support $queryRaw. PostgreSQL connection or ambient transaction client is required for atomic FOR UPDATE SKIP LOCKED row claiming.'
      );
    }

    const rows = await client.$queryRaw<RecurringExpensePersistenceData[]>`
      SELECT id, workspace_id as "workspaceId", user_id as "userId", frequency, interval,
             start_date as "startDate", end_date as "endDate", next_run_date as "nextRunDate",
             status, template, consecutive_failures as "consecutiveFailures",
             last_failure_reason as "lastFailureReason", last_failure_at as "lastFailureAt",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM "expense_ledger"."recurring_expenses"
      WHERE "status" = 'ACTIVE'::"expense_ledger"."RecurrenceStatus"
        AND "next_run_date" <= ${beforeDate}
        ${workspaceId ? Prisma.sql`AND "workspace_id" = ${workspaceId}::uuid` : Prisma.empty}
      ORDER BY "next_run_date" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;
    if (Array.isArray(rows) && rows.length > 0) {
      return this.toDomain(rows[0]);
    }
    return null;
  }

  /**
   * Worker-level atomic claim by ID: locks and retrieves a specific recurring expense
   * using PostgreSQL FOR UPDATE SKIP LOCKED within an active transaction if it is due.
   * Returns null if locked by another transaction, not found, or not due.
   */
  async claimById(
    id: RecurringExpenseId,
    workspaceId: string,
    beforeDate?: Date
  ): Promise<RecurringExpense | null> {
    const client = this.prisma;
    if (typeof client.$queryRaw !== 'function') {
      throw new Error(
        'PrismaClient instance does not support $queryRaw. PostgreSQL connection or ambient transaction client is required for atomic FOR UPDATE SKIP LOCKED row claiming.'
      );
    }

    const rows = await client.$queryRaw<RecurringExpensePersistenceData[]>`
      SELECT id, workspace_id as "workspaceId", user_id as "userId", frequency, interval,
             start_date as "startDate", end_date as "endDate", next_run_date as "nextRunDate",
             status, template, consecutive_failures as "consecutiveFailures",
             last_failure_reason as "lastFailureReason", last_failure_at as "lastFailureAt",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM "expense_ledger"."recurring_expenses"
      WHERE "id" = ${id.getValue()}::uuid
        AND "workspace_id" = ${workspaceId}::uuid
        AND "status" = 'ACTIVE'::"expense_ledger"."RecurrenceStatus"
        ${beforeDate ? Prisma.sql`AND "next_run_date" <= ${beforeDate}` : Prisma.empty}
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;
    if (Array.isArray(rows) && rows.length > 0) {
      return this.toDomain(rows[0]);
    }
    return null;
  }

  async findDueExpenses(
    beforeDate: Date,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<RecurringExpense>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.recurringExpense,
      {
        where: {
          status: toPrismaStatus(RecurrenceStatus.ACTIVE),
          nextRunDate: {
            lte: beforeDate,
          },
        },
        orderBy: { nextRunDate: "asc" },
      },
      (expense) => this.toDomain(expense),
      options,
    );
  }

  async delete(id: RecurringExpenseId, workspaceId: string): Promise<void> {
    await this.prisma.recurringExpense.deleteMany({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    });
  }

  private toDomain(
    data: RecurringExpensePersistenceData,
  ): RecurringExpense {
    return RecurringExpense.fromPersistence({
      id: RecurringExpenseId.fromString(data.id),
      workspaceId: data.workspaceId,
      userId: data.userId,
      frequency: toDomainFrequency(data.frequency),
      interval: data.interval,
      startDate: data.startDate,
      endDate: data.endDate ?? undefined,
      nextRunDate: data.nextRunDate,
      status: toDomainStatus(data.status),
      template: jsonToTemplate(data.template),
      consecutiveFailures: data.consecutiveFailures ?? 0,
      lastFailureReason: data.lastFailureReason ?? undefined,
      lastFailureAt: data.lastFailureAt ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
