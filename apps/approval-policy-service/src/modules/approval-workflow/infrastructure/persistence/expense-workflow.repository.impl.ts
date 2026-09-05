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
} from '@core/domain/interfaces/paginated-result.interface';
import { IExpenseWorkflowRepository } from '../../domain/repositories/expense-workflow.repository';
import { ExpenseWorkflow } from '../../domain/entities/expense-workflow.entity';
import { ApprovalStep } from '../../domain/entities/approval-step.entity';
import { ApprovalStepId } from '../../domain/value-objects/approval-step-id';
import { WorkflowId } from '../../domain/value-objects/workflow-id';
import { ApprovalChainId } from '../../domain/value-objects/approval-chain-id';
import {  ExpenseId  } from '@core/domain/value-objects';
import {  WorkspaceId, UserId  } from '@core/domain/value-objects';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { IEventBus } from '@core/domain/events/domain-event';

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
        where: { id: workflow.id.getValue() },
        create: workflowData.create,
        update: workflowData.update,
      });

      // Save steps
      for (const step of workflow.steps) {
        const stepData = this.toPersistence(step);

        await tx.approvalStep.upsert({
          where: { id: step.id.getValue() },
          create: stepData.create,
          update: stepData.update,
        });
      }
    });
    await this.dispatchEvents(workflow);
  }

  async findById(workflowId: WorkflowId): Promise<ExpenseWorkflow | null> {
    const row = await this.prisma.expenseWorkflow.findUnique({
      where: { id: workflowId.getValue() },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });

    return row ? this.toDomain(row) : null;
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
    const where: Prisma.ExpenseWorkflowWhereInput = { workspaceId };

    return PrismaRepositoryHelper.paginate(
      this.prisma.expenseWorkflow,
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: { steps: { orderBy: { stepNumber: 'asc' } } },
      },
      (record) => this.toDomain(record as Prisma.ExpenseWorkflowGetPayload<{ include: { steps: true } }>),
      options
    );
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

    return PrismaRepositoryHelper.paginate(
      this.prisma.expenseWorkflow,
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: { steps: { orderBy: { stepNumber: 'asc' } } },
      },
      (record) => this.toDomain(record as Prisma.ExpenseWorkflowGetPayload<{ include: { steps: true } }>),
      options
    );
  }

  async findByUser(
    userId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflow>> {
    const where: Prisma.ExpenseWorkflowWhereInput = { userId, workspaceId };

    return PrismaRepositoryHelper.paginate(
      this.prisma.expenseWorkflow,
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: { steps: { orderBy: { stepNumber: 'asc' } } },
      },
      (record) => this.toDomain(record as Prisma.ExpenseWorkflowGetPayload<{ include: { steps: true } }>),
      options
    );
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
          id: entity.id.getValue(),
          expenseId: entity.expenseId.getValue(),
          workspaceId: entity.workspaceId.getValue(),
          userId: entity.userId.getValue(),
          chainId: entity.chainId.getValue(),
          status: toDbWorkflowStatus(entity.status),
          currentStepNumber: entity.currentStepNumber,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
          completedAt: entity.completedAt,
        },
        update: {
          status: toDbWorkflowStatus(entity.status),
          currentStepNumber: entity.currentStepNumber,
          updatedAt: entity.updatedAt,
          completedAt: entity.completedAt,
        },
      };
    }

    return {
      create: {
        id: entity.id.getValue(),
        workflowId: entity.workflowId.getValue(),
        stepNumber: entity.stepNumber,
        approverId: entity.approverId.getValue(),
        delegatedTo: entity.delegatedTo?.getValue(),
        status: toDbApprovalStatus(entity.status),
        comments: entity.comments,
        processedAt: entity.processedAt,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      },
      update: {
        delegatedTo: entity.delegatedTo?.getValue(),
        status: toDbApprovalStatus(entity.status),
        comments: entity.comments,
        processedAt: entity.processedAt,
        updatedAt: entity.updatedAt,
      },
    };
  }

  private toDomain(
    row: Prisma.ExpenseWorkflowGetPayload<{ include: { steps: true } }>
  ): ExpenseWorkflow {
    const steps = row.steps.map((stepRow) =>
      ApprovalStep.fromPersistence({
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

    return ExpenseWorkflow.fromPersistence({
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
