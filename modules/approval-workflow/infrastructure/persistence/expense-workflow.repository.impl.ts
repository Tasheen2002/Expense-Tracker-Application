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
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { IExpenseWorkflowRepository } from '../../domain/repositories/expense-workflow.repository';
import { ExpenseWorkflow } from '../../domain/entities/expense-workflow.entity';
import { ApprovalStep } from '../../domain/entities/approval-step.entity';
import { ApprovalStepId } from '../../domain/value-objects/approval-step-id';
import { WorkflowId } from '../../domain/value-objects/workflow-id';
import { ApprovalChainId } from '../../domain/value-objects/approval-chain-id';
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id';
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { UserId } from '../../../identity-workspace/domain/value-objects/user-id.vo';
import { PrismaRepository } from '../../../../packages/core/src/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';

export class PrismaExpenseWorkflowRepository
  extends PrismaRepository<ExpenseWorkflow>
  implements IExpenseWorkflowRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(workflow: ExpenseWorkflow): Promise<void> {
    const workflowData = this.toPersistence(workflow);

    await this.prisma.$transaction(async (tx) => {
      await tx.expenseWorkflow.upsert({
        where: { id: workflow.getId().getValue() },
        create: workflowData.create,
        update: workflowData.update,
      });

      // Save steps
      for (const step of workflow.getSteps()) {
        const stepData = this.toPersistence(step);

        await tx.approvalStep.upsert({
          where: { id: step.getId().getValue() },
          create: stepData.create,
          update: stepData.update,
        });
      }
    });
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

  private toPersistence(workflow: ExpenseWorkflow): {
    create: Prisma.ExpenseWorkflowUncheckedCreateInput;
    update: Prisma.ExpenseWorkflowUncheckedUpdateInput;
  };
  private toPersistence(step: ApprovalStep): {
    create: Prisma.ApprovalStepUncheckedCreateInput;
    update: Prisma.ApprovalStepUncheckedUpdateInput;
  };
  private toPersistence(entity: ExpenseWorkflow | ApprovalStep): {
    create:
      | Prisma.ExpenseWorkflowUncheckedCreateInput
      | Prisma.ApprovalStepUncheckedCreateInput;
    update:
      | Prisma.ExpenseWorkflowUncheckedUpdateInput
      | Prisma.ApprovalStepUncheckedUpdateInput;
  } {
    if (entity instanceof ExpenseWorkflow) {
      return {
        create: {
          id: entity.getId().getValue(),
          expenseId: entity.getExpenseId().getValue(),
          workspaceId: entity.getWorkspaceId().getValue(),
          userId: entity.getUserId().getValue(),
          chainId: entity.getChainId().getValue(),
          status: toDbWorkflowStatus(entity.getStatus()),
          currentStepNumber: entity.getCurrentStepNumber(),
          createdAt: entity.getCreatedAt(),
          updatedAt: entity.getUpdatedAt(),
          completedAt: entity.getCompletedAt(),
        },
        update: {
          status: toDbWorkflowStatus(entity.getStatus()),
          currentStepNumber: entity.getCurrentStepNumber(),
          updatedAt: entity.getUpdatedAt(),
          completedAt: entity.getCompletedAt(),
        },
      };
    }

    return {
      create: {
        id: entity.getId().getValue(),
        workflowId: entity.getWorkflowId().getValue(),
        stepNumber: entity.getStepNumber(),
        approverId: entity.getApproverId().getValue(),
        delegatedTo: entity.getDelegatedTo()?.getValue(),
        status: toDbApprovalStatus(entity.getStatus()),
        comments: entity.getComments(),
        processedAt: entity.getProcessedAt(),
        createdAt: entity.getCreatedAt(),
        updatedAt: entity.getUpdatedAt(),
      },
      update: {
        delegatedTo: entity.getDelegatedTo()?.getValue(),
        status: toDbApprovalStatus(entity.getStatus()),
        comments: entity.getComments(),
        processedAt: entity.getProcessedAt(),
        updatedAt: entity.getUpdatedAt(),
      },
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
      steps,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt ?? undefined,
    });
  }
}
