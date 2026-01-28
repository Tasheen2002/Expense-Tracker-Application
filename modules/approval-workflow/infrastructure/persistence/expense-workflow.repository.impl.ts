import { PrismaClient } from "@prisma/client";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { ExpenseWorkflowRepository } from "../../domain/repositories/expense-workflow.repository";
import { ExpenseWorkflow } from "../../domain/entities/expense-workflow.entity";
import { ApprovalStep } from "../../domain/entities/approval-step.entity";
import { ApprovalStepId } from "../../domain/value-objects/approval-step-id";
import { WorkflowId } from "../../domain/value-objects/workflow-id";
import { ApprovalChainId } from "../../domain/value-objects/approval-chain-id";
import { WorkflowStatus } from "../../domain/enums/workflow-status";
import { ApprovalStatus } from "../../domain/enums/approval-status";
import { ExpenseId } from "../../../expense-ledger/domain/value-objects/expense-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";

export class PrismaExpenseWorkflowRepository implements ExpenseWorkflowRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(workflow: ExpenseWorkflow): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.expenseWorkflow.upsert({
        where: { id: workflow.getId().getValue() },
        create: {
          id: workflow.getId().getValue(),
          expenseId: workflow.getExpenseId().getValue(),
          workspaceId: workflow.getWorkspaceId().getValue(),
          userId: workflow.getUserId().getValue(),
          chainId: workflow.getChainId().getValue(),
          status: workflow.getStatus() as any,
          currentStepNumber: workflow.getCurrentStepNumber(),
          createdAt: workflow.getCreatedAt(),
          updatedAt: workflow.getUpdatedAt(),
          completedAt: workflow.getCompletedAt(),
        },
        update: {
          status: workflow.getStatus() as any,
          currentStepNumber: workflow.getCurrentStepNumber(),
          updatedAt: workflow.getUpdatedAt(),
          completedAt: workflow.getCompletedAt(),
        },
      });

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
            status: step.getStatus() as any,
            comments: step.getComments(),
            processedAt: step.getProcessedAt(),
            createdAt: step.getCreatedAt(),
            updatedAt: step.getUpdatedAt(),
          },
          update: {
            delegatedTo: step.getDelegatedTo()?.getValue(),
            status: step.getStatus() as any,
            comments: step.getComments(),
            processedAt: step.getProcessedAt(),
            updatedAt: step.getUpdatedAt(),
          },
        });
      }
    });
  }

  async findByExpenseId(expenseId: string): Promise<ExpenseWorkflow | null> {
    const row = await this.prisma.expenseWorkflow.findUnique({
      where: { expenseId },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpenseWorkflow>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [rows, total] = await Promise.all([
      this.prisma.expenseWorkflow.findMany({
        where: { workspaceId },
        include: { steps: { orderBy: { stepNumber: "asc" } } },
        orderBy: { createdAt: "desc" },
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
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpenseWorkflow>> {
    const where = {
      workspaceId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
      steps: {
        some: {
          OR: [
            { approverId, status: "PENDING" },
            { delegatedTo: approverId, status: "DELEGATED" },
          ],
        },
      },
    } as any;

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [rows, total] = await Promise.all([
      this.prisma.expenseWorkflow.findMany({
        where,
        include: { steps: { orderBy: { stepNumber: "asc" } } },
        orderBy: { createdAt: "desc" },
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
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpenseWorkflow>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [rows, total] = await Promise.all([
      this.prisma.expenseWorkflow.findMany({
        where: {
          userId,
          workspaceId,
        },
        include: { steps: { orderBy: { stepNumber: "asc" } } },
        orderBy: { createdAt: "desc" },
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

  private toDomain(row: any): ExpenseWorkflow {
    const steps = row.steps.map((stepRow: any) =>
      ApprovalStep.reconstitute({
        stepId: ApprovalStepId.fromString(stepRow.id),
        workflowId: WorkflowId.fromString(stepRow.workflowId),
        stepNumber: stepRow.stepNumber,
        approverId: UserId.fromString(stepRow.approverId),
        delegatedTo: stepRow.delegatedTo
          ? UserId.fromString(stepRow.delegatedTo)
          : undefined,
        status: stepRow.status as ApprovalStatus,
        comments: stepRow.comments,
        processedAt: stepRow.processedAt,
        createdAt: stepRow.createdAt,
        updatedAt: stepRow.updatedAt,
      }),
    );

    return ExpenseWorkflow.reconstitute({
      workflowId: WorkflowId.fromString(row.id),
      expenseId: ExpenseId.fromString(row.expenseId),
      workspaceId: WorkspaceId.fromString(row.workspaceId),
      userId: UserId.fromString(row.userId),
      chainId: ApprovalChainId.fromString(row.chainId),
      status: row.status as WorkflowStatus,
      currentStepNumber: row.currentStepNumber,
      steps,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt,
    });
  }
}
