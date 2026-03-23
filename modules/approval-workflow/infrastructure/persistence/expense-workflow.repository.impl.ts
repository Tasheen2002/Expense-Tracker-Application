import { PrismaClient, Prisma } from '@prisma/client';
import {
  toDbWorkflowStatus,
  fromDbWorkflowStatus,
  toDbApprovalStatus,
  fromDbApprovalStatus,
} from './enum-mappers';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import { IExpenseWorkflowRepository } from '../../domain/repositories/expense-workflow.repository';
import { ExpenseWorkflow } from '../../domain/entities/expense-workflow.entity';
import { ApprovalStep } from '../../domain/entities/approval-step.entity';
import { ApprovalStepId } from '../../domain/value-objects/approval-step-id';
import { WorkflowId } from '../../domain/value-objects/workflow-id';
import { ApprovalChainId } from '../../domain/value-objects/approval-chain-id';
import { ExpenseId } from '../../../expense-ledger';
import { WorkspaceId, UserId } from '../../../identity-workspace';
import { PrismaRepository } from '../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '../../../../apps/api/src/shared/domain/events/domain-event';
import { ConcurrencyConflictError } from '../../domain/errors/approval-workflow.errors';

export class PrismaExpenseWorkflowRepository
  extends PrismaRepository<ExpenseWorkflow>
  implements IExpenseWorkflowRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(workflow: ExpenseWorkflow): Promise<void> {
    const id = workflow.getId().getValue();
    const isNew = workflow.isNewRecord();

    await this.prisma.$transaction(async (tx) => {
      if (isNew) {
        await tx.expenseWorkflow.create({
          data: {
            id,
            expenseId: workflow.getExpenseId().getValue(),
            workspaceId: workflow.getWorkspaceId().getValue(),
            userId: workflow.getUserId().getValue(),
            chainId: workflow.getChainId().getValue(),
            status: toDbWorkflowStatus(workflow.getStatus()),
            currentStepNumber: workflow.getCurrentStepNumber(),
            version: 1,
            createdAt: workflow.getCreatedAt(),
            updatedAt: workflow.getUpdatedAt(),
            completedAt: workflow.getCompletedAt(),
          },
        });
      } else {
        const currentVersion = workflow.getVersion();
        const result = await tx.expenseWorkflow.updateMany({
          where: { id, version: currentVersion },
          data: {
            status: toDbWorkflowStatus(workflow.getStatus()),
            currentStepNumber: workflow.getCurrentStepNumber(),
            version: currentVersion + 1,
            updatedAt: workflow.getUpdatedAt(),
            completedAt: workflow.getCompletedAt(),
          },
        });

        if (result.count === 0) {
          throw new ConcurrencyConflictError(id);
        }
      }

      // Save steps
      for (const step of workflow.getSteps()) {
        await tx.approvalStep.upsert({
          where: { id: step.getId().getValue() },
          create: {
            id: step.getId().getValue(),
            workflowId: step.getWorkflowId().getValue(),
            stepNumber: step.getStepNumber(),
            approverId: step.getApproverId().getValue(),
            delegatedTo: step.getDelegatedTo()?.getValue(),
            status: toDbApprovalStatus(step.getStatus()),
            comments: step.getComments(),
            processedAt: step.getProcessedAt(),
            createdAt: step.getCreatedAt(),
            updatedAt: step.getUpdatedAt(),
          },
          update: {
            delegatedTo: step.getDelegatedTo()?.getValue(),
            status: toDbApprovalStatus(step.getStatus()),
            comments: step.getComments(),
            processedAt: step.getProcessedAt(),
            updatedAt: step.getUpdatedAt(),
          },
        });
      }
    });

    // Mark as persisted after a successful DB commit so subsequent saves
    // on the same instance (within the same request) use the update path
    if (isNew) {
      workflow.markAsPersisted();
    }

    await this.dispatchEvents(workflow);
  }

  async findByExpenseId(expenseId: string): Promise<ExpenseWorkflow | null> {
    const row = await this.prisma.expenseWorkflow.findUnique({
      where: { expenseId },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflow>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [rows, total] = await Promise.all([
      this.prisma.expenseWorkflow.findMany({
        where: { workspaceId },
        include: { steps: { orderBy: { stepNumber: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.expenseWorkflow.count({ where: { workspaceId } }),
    ]);

    return {
      items: rows.map((row) => this.toDomain(row)),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  }

  async findPendingByApprover(
    approverId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflow>> {
    const where: Prisma.ExpenseWorkflowWhereInput = {
      workspaceId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      steps: {
        some: {
          OR: [
            { approverId, status: 'PENDING' },
            { delegatedTo: approverId, status: 'DELEGATED' },
          ],
        },
      },
    };

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [rows, total] = await Promise.all([
      this.prisma.expenseWorkflow.findMany({
        where,
        include: { steps: { orderBy: { stepNumber: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.expenseWorkflow.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDomain(row)),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  }

  async findByUser(
    userId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflow>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [rows, total] = await Promise.all([
      this.prisma.expenseWorkflow.findMany({
        where: {
          userId,
          workspaceId,
        },
        include: { steps: { orderBy: { stepNumber: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.expenseWorkflow.count({ where: { userId, workspaceId } }),
    ]);

    return {
      items: rows.map((row) => this.toDomain(row)),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  }

  private toDomain(
    row: Prisma.ExpenseWorkflowGetPayload<{ include: { steps: true } }>
  ): ExpenseWorkflow {
    const steps = row.steps.map((stepRow) =>
      ApprovalStep.reconstitute({
        stepId: ApprovalStepId.fromString(stepRow.id),
        workflowId: WorkflowId.fromString(stepRow.workflowId),
        stepNumber: stepRow.stepNumber,
        approverId: UserId.fromString(stepRow.approverId),
        delegatedTo: stepRow.delegatedTo
          ? UserId.fromString(stepRow.delegatedTo)
          : undefined,
        status: fromDbApprovalStatus(stepRow.status),
        comments: stepRow.comments ?? undefined,
        processedAt: stepRow.processedAt ?? undefined,
        createdAt: stepRow.createdAt,
        updatedAt: stepRow.updatedAt,
      })
    );

    return ExpenseWorkflow.reconstitute({
      workflowId: WorkflowId.fromString(row.id),
      expenseId: ExpenseId.fromString(row.expenseId),
      workspaceId: WorkspaceId.fromString(row.workspaceId),
      userId: UserId.fromString(row.userId),
      chainId: ApprovalChainId.fromString(row.chainId),
      status: fromDbWorkflowStatus(row.status),
      currentStepNumber: row.currentStepNumber,
      version: row.version,
      steps,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt ?? undefined,
    });
  }
}
