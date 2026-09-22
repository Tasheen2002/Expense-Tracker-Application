import { PrismaClient } from '@shared/infrastructure/persistence/prisma.client';
import type { Prisma } from '@prisma/client';
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
import { ApprovalStep, ApprovalStepSnapshot } from '../../domain/entities/approval-step.entity';
import {
  ApprovalStepId,
  WorkflowId,
  ApprovalChainId,
} from '../../domain/value-objects';
import { ExpenseId, WorkspaceId, UserId } from '@core/domain/value-objects';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { IEventBus } from '@core/domain/events/domain-event';
import { ConcurrencyConflictError } from '../../domain/errors/approval-workflow.errors';

export class PrismaExpenseWorkflowRepository
  extends PrismaRepository<ExpenseWorkflow>
  implements IExpenseWorkflowRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(workflow: ExpenseWorkflow): Promise<void> {
    const workflowData = this.workflowToPersistence(workflow);
    const workflowId = workflow.id.getValue();
    const expectedVersion = workflow.version;
    let nextVersion: number | null = null;

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.expenseWorkflow.findUnique({
        where: { id: workflowId },
        select: { version: true },
      });

      if (!existing) {
        await tx.expenseWorkflow.create({
          data: {
            ...workflowData.create,
            version: expectedVersion,
          },
        });
      } else {
        const updateResult = await tx.expenseWorkflow.updateMany({
          where: {
            id: workflowId,
            version: expectedVersion,
          },
          data: {
            ...workflowData.update,
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw new ConcurrencyConflictError(workflowId);
        }

        nextVersion = expectedVersion + 1;
      }

      // Save steps using immutable snapshots
      for (const step of workflow.getStepSnapshots()) {
        const stepData = this.stepSnapshotToPersistence(step);

        await tx.approvalStep.upsert({
          where: { id: step.id.getValue() },
          create: stepData.create,
          update: stepData.update,
        });
      }

      // Transactional Outbox: persist domain events in the exact same transaction
      await this.persistOutboxEvents(tx, workflow);
    });

    // Synchronize aggregate version ONLY after the database transaction has successfully committed
    if (nextVersion !== null) {
      workflow.synchronizeVersion(nextVersion);
    }

    await this.dispatchEvents(workflow);
  }

  async findById(workflowId: WorkflowId): Promise<ExpenseWorkflow | null> {
    const row = await this.prisma.expenseWorkflow.findUnique({
      where: { id: workflowId.getValue() },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByExpenseId(expenseId: ExpenseId): Promise<ExpenseWorkflow | null> {
    const row = await this.prisma.expenseWorkflow.findUnique({
      where: { expenseId: expenseId.getValue() },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflow>> {
    const where: Prisma.ExpenseWorkflowWhereInput = { workspaceId: workspaceId.getValue() };

    return PrismaRepositoryHelper.paginate(
      this.prisma.expenseWorkflow,
      {
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: { steps: { orderBy: { stepNumber: 'asc' } } },
      },
      (record) => this.toDomain(record as Prisma.ExpenseWorkflowGetPayload<{ include: { steps: true } }>),
      options
    );
  }

  async findPendingByApproverId(
    approverId: UserId,
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflow>> {
    const requestedLimit = options?.limit || 50;
    const limit = Math.min(Math.max(1, requestedLimit), 100);
    const offset = Math.max(0, options?.offset || 0);
    const wsId = workspaceId.getValue();
    const appId = approverId.getValue();

    // In production PostgreSQL, correlated JOIN ensures s.step_number = w.current_step_number
    // Lowercase enum literals match PostgreSQL enum labels from schema (@map("pending"), @map("in_progress"), etc.)
    const idRows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT w.id
      FROM approval_workflow.expense_workflows w
      INNER JOIN approval_workflow.approval_steps s
        ON s.workflow_id = w.id AND s.step_number = w.current_step_number
      WHERE w.workspace_id = ${wsId}::uuid
        AND w.status IN ('pending'::approval_workflow."WorkflowStatus", 'in_progress'::approval_workflow."WorkflowStatus")
        AND (
          (s.approver_id = ${appId}::uuid AND s.status = 'pending'::approval_workflow."ApprovalStatus")
          OR (s.delegated_to = ${appId}::uuid AND s.status = 'delegated'::approval_workflow."ApprovalStatus")
        )
      ORDER BY w.created_at DESC, w.id ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countRows = await this.prisma.$queryRaw<{ count: bigint | number }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM approval_workflow.expense_workflows w
      INNER JOIN approval_workflow.approval_steps s
        ON s.workflow_id = w.id AND s.step_number = w.current_step_number
      WHERE w.workspace_id = ${wsId}::uuid
        AND w.status IN ('pending'::approval_workflow."WorkflowStatus", 'in_progress'::approval_workflow."WorkflowStatus")
        AND (
          (s.approver_id = ${appId}::uuid AND s.status = 'pending'::approval_workflow."ApprovalStatus")
          OR (s.delegated_to = ${appId}::uuid AND s.status = 'delegated'::approval_workflow."ApprovalStatus")
        )
    `;

    const total = Number(countRows[0]?.count ?? 0);
    const ids = idRows.map((r) => r.id);

    if (ids.length === 0) {
      return { items: [], total, limit, offset, hasMore: false };
    }

    const rows = await this.prisma.expenseWorkflow.findMany({
      where: { id: { in: ids } },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });

    const rowMap = new Map(rows.map((r) => [r.id, r]));
    const orderedRows = ids
      .map((id) => rowMap.get(id))
      .filter((r): r is NonNullable<typeof r> => r !== undefined);

    return {
      items: orderedRows.map((r) => this.toDomain(r)),
      total,
      limit,
      offset,
      hasMore: offset + ids.length < total,
    };
  }

  async findByUserId(
    userId: UserId,
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseWorkflow>> {
    const where: Prisma.ExpenseWorkflowWhereInput = {
      userId: userId.getValue(),
      workspaceId: workspaceId.getValue(),
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.expenseWorkflow,
      {
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: { steps: { orderBy: { stepNumber: 'asc' } } },
      },
      (record) => this.toDomain(record as Prisma.ExpenseWorkflowGetPayload<{ include: { steps: true } }>),
      options
    );
  }

  async exists(workflowId: WorkflowId): Promise<boolean> {
    const count = await this.prisma.expenseWorkflow.count({
      where: { id: workflowId.getValue() },
    });
    return count > 0;
  }

  async countByWorkspaceId(workspaceId: WorkspaceId): Promise<number> {
    return this.prisma.expenseWorkflow.count({
      where: { workspaceId: workspaceId.getValue() },
    });
  }

  private workflowToPersistence(workflow: ExpenseWorkflow): {
    create: Prisma.ExpenseWorkflowUncheckedCreateInput;
    update: Prisma.ExpenseWorkflowUncheckedUpdateInput;
  } {
    return {
      create: {
        id: workflow.id.getValue(),
        expenseId: workflow.expenseId.getValue(),
        workspaceId: workflow.workspaceId.getValue(),
        userId: workflow.userId.getValue(),
        chainId: workflow.chainId.getValue(),
        status: toDbWorkflowStatus(workflow.status),
        currentStepNumber: workflow.currentStepNumber,
        version: workflow.version,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
        completedAt: workflow.completedAt ?? null,
      },
      update: {
        status: toDbWorkflowStatus(workflow.status),
        currentStepNumber: workflow.currentStepNumber,
        updatedAt: workflow.updatedAt,
        completedAt: workflow.completedAt ?? null,
      },
    };
  }

  private stepSnapshotToPersistence(step: ApprovalStepSnapshot): {
    create: Prisma.ApprovalStepUncheckedCreateInput;
    update: Prisma.ApprovalStepUncheckedUpdateInput;
  } {
    return {
      create: {
        id: step.id.getValue(),
        workflowId: step.workflowId.getValue(),
        stepNumber: step.stepNumber,
        approverId: step.approverId.getValue(),
        delegatedTo: step.delegatedTo?.getValue() ?? null,
        status: toDbApprovalStatus(step.status),
        comments: step.comments ?? null,
        processedAt: step.processedAt ?? null,
        createdAt: step.createdAt,
        updatedAt: step.updatedAt,
      },
      update: {
        delegatedTo: step.delegatedTo?.getValue() ?? null,
        status: toDbApprovalStatus(step.status),
        comments: step.comments ?? null,
        processedAt: step.processedAt ?? null,
        updatedAt: step.updatedAt,
      },
    };
  }

  private toDomain(
    row: Prisma.ExpenseWorkflowGetPayload<{ include: { steps: true } }>
  ): ExpenseWorkflow {
    const sortedSteps = [...row.steps].sort((a, b) => a.stepNumber - b.stepNumber);
    const steps = sortedSteps.map((stepRow) =>
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
      version: row.version,
      steps,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt ?? undefined,
    });
  }
}
