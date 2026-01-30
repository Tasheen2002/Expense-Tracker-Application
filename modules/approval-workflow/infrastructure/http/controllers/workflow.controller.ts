import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { WorkflowService } from "../../../application/services/workflow.service";
import { ExpenseWorkflow } from "../../../domain/entities/expense-workflow.entity";
import { ApprovalStep } from "../../../domain/entities/approval-step.entity";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";

export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  async initiateWorkflow(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: {
        expenseId: string;
        amount: number;
        categoryId?: string;
        hasReceipt: boolean;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId } = request.params;

      const workflow = await this.workflowService.initiateWorkflow({
        ...request.body,
        userId, // Use authenticated user instead of body param
        workspaceId,
      });

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: "Workflow initiated successfully",
        data: this.serializeWorkflow(workflow),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getWorkflow(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, expenseId } = request.params;

      const workflow = await this.workflowService.getWorkflow(
        expenseId,
        workspaceId,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Workflow retrieved successfully",
        data: this.serializeWorkflow(workflow),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async approveStep(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
      Body: {
        comments?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      // SECURITY FIX: Use authenticated user as approver instead of trusting body
      const approverId = request.user.userId;

      const { expenseId } = request.params;

      const workflow = await this.workflowService.approveStep({
        expenseId,
        approverId, // Use authenticated user, not body param
        comments: request.body.comments,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Step approved successfully",
        data: this.serializeWorkflow(workflow),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async rejectStep(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
      Body: {
        comments: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      // SECURITY FIX: Use authenticated user as approver instead of trusting body
      const approverId = request.user.userId;

      const { expenseId } = request.params;

      const workflow = await this.workflowService.rejectStep({
        expenseId,
        approverId, // Use authenticated user, not body param
        comments: request.body.comments,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Step rejected successfully",
        data: this.serializeWorkflow(workflow),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async delegateStep(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
      Body: {
        toUserId: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      // SECURITY FIX: Use authenticated user as the delegating user
      const fromUserId = request.user.userId;

      const { expenseId } = request.params;

      const workflow = await this.workflowService.delegateStep({
        expenseId,
        fromUserId, // Use authenticated user
        toUserId: request.body.toUserId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Step delegated successfully",
        data: this.serializeWorkflow(workflow),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async cancelWorkflow(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, expenseId } = request.params;

      const workflow = await this.workflowService.cancelWorkflow(
        expenseId,
        workspaceId,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Workflow cancelled successfully",
        data: this.serializeWorkflow(workflow),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listPendingApprovals(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      // SECURITY FIX: Use authenticated user ID instead of query param
      const approverId = request.user.userId;

      const { workspaceId } = request.params;
      const { limit, offset } = request.query;

      const result = await this.workflowService.listPendingApprovals(
        approverId,
        workspaceId,
        {
          limit: limit ? parseInt(limit, 10) : 50,
          offset: offset ? parseInt(offset, 10) : 0,
        },
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Pending approvals retrieved successfully",
        data: {
          items: result.items.map((w) => this.serializeWorkflow(w)),
          pagination: {
            total: result.total,
            limit: result.limit,
            offset: result.offset,
            hasMore: result.hasMore,
          },
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listUserWorkflows(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: {
        limit?: string;
        offset?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId } = request.params;
      const { limit, offset } = request.query;

      const result = await this.workflowService.listUserWorkflows(
        userId,
        workspaceId,
        {
          limit: limit ? parseInt(limit, 10) : 50,
          offset: offset ? parseInt(offset, 10) : 0,
        },
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "User workflows retrieved successfully",
        data: {
          items: result.items.map((w) => this.serializeWorkflow(w)),
          pagination: {
            total: result.total,
            limit: result.limit,
            offset: result.offset,
            hasMore: result.hasMore,
          },
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  private serializeWorkflow(workflow: ExpenseWorkflow) {
    return {
      workflowId: workflow.getId().getValue(),
      expenseId: workflow.getExpenseId().getValue(),
      workspaceId: workflow.getWorkspaceId().getValue(),
      userId: workflow.getUserId().getValue(),
      chainId: workflow.getChainId()?.getValue(),
      status: workflow.getStatus(),
      currentStepNumber: workflow.getCurrentStepNumber(),
      steps: workflow.getSteps().map((step) => this.serializeStep(step)),
      createdAt: workflow.getCreatedAt().toISOString(),
      updatedAt: workflow.getUpdatedAt().toISOString(),
      completedAt: workflow.getCompletedAt()?.toISOString(),
    };
  }

  private serializeStep(step: ApprovalStep) {
    return {
      stepId: step.getId().getValue(),
      workflowId: step.getWorkflowId().getValue(),
      stepNumber: step.getStepNumber(),
      approverId: step.getApproverId().getValue(),
      delegatedTo: step.getDelegatedTo()?.getValue(),
      status: step.getStatus(),
      comments: step.getComments(),
      processedAt: step.getProcessedAt()?.toISOString(),
      createdAt: step.getCreatedAt().toISOString(),
      updatedAt: step.getUpdatedAt().toISOString(),
    };
  }
}
