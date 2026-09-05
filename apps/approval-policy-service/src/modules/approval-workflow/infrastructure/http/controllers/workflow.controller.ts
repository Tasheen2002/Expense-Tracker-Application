import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { InitiateWorkflowHandler } from '../../../application/commands/initiate-workflow.command';
import { ApproveStepHandler } from '../../../application/commands/approve-step.command';
import { RejectStepHandler } from '../../../application/commands/reject-step.command';
import { DelegateStepHandler } from '../../../application/commands/delegate-step.command';
import { CancelWorkflowHandler } from '../../../application/commands/cancel-workflow.command';
import { GetWorkflowHandler } from '../../../application/queries/get-workflow.query';
import { ListPendingApprovalsHandler } from '../../../application/queries/list-pending-approvals.query';
import { ListUserWorkflowsHandler } from '../../../application/queries/list-user-workflows.query';
import { ResponseHelper } from '@shared/response.helper';
import {
  InitiateWorkflowBody,
  ApproveStepBody,
  RejectStepBody,
  DelegateStepBody,
  WorkspaceParams,
  WorkflowParams,
  PaginationQuery,
} from '../validation/approval.schema';

export class WorkflowController {
  constructor(
    private readonly initiateWorkflowHandler: InitiateWorkflowHandler,
    private readonly approveStepHandler: ApproveStepHandler,
    private readonly rejectStepHandler: RejectStepHandler,
    private readonly delegateStepHandler: DelegateStepHandler,
    private readonly cancelWorkflowHandler: CancelWorkflowHandler,
    private readonly getWorkflowHandler: GetWorkflowHandler,
    private readonly listPendingApprovalsHandler: ListPendingApprovalsHandler,
    private readonly listUserWorkflowsHandler: ListUserWorkflowsHandler
  ) {}

  async getWorkflow(
    request: AuthenticatedRequest<{
      Params: WorkflowParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId } = request.params;

      const workflow = await this.getWorkflowHandler.handle({
        expenseId,
        workspaceId,
      });

      return ResponseHelper.ok(reply, 'Workflow retrieved successfully', workflow);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listPendingApprovals(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Querystring: PaginationQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      // SECURITY: Use authenticated user ID instead of query param
      const approverId = request.user.userId;
      const { workspaceId } = request.params;
      const { limit, offset } = request.query;

      const result = await this.listPendingApprovalsHandler.handle({
        approverId,
        workspaceId,
        limit: limit ?? 50,
        offset: offset ?? 0,
      });

      return ResponseHelper.ok(reply, 'Pending approvals retrieved successfully', {
        items: result.items,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listUserWorkflows(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Querystring: PaginationQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId } = request.params;
      const { limit, offset } = request.query;

      const result = await this.listUserWorkflowsHandler.handle({
        userId,
        workspaceId,
        limit: limit ?? 50,
        offset: offset ?? 0,
      });

      return ResponseHelper.ok(reply, 'User workflows retrieved successfully', {
        items: result.items,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async initiateWorkflow(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Body: InitiateWorkflowBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId } = request.params;

      const result = await this.initiateWorkflowHandler.handle({
        ...request.body,
        userId,
        workspaceId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Workflow initiated successfully',
        result.data ?? undefined,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async approveStep(
    request: AuthenticatedRequest<{
      Params: WorkflowParams;
      Body: ApproveStepBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      // SECURITY: Use authenticated user as approver instead of trusting body
      const approverId = request.user.userId;
      const { workspaceId, expenseId } = request.params;

      const result = await this.approveStepHandler.handle({
        expenseId,
        workspaceId,
        approverId,
        comments: request.body.comments,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Step approved successfully',
        { expenseId }
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async rejectStep(
    request: AuthenticatedRequest<{
      Params: WorkflowParams;
      Body: RejectStepBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      // SECURITY: Use authenticated user as approver instead of trusting body
      const approverId = request.user.userId;
      const { workspaceId, expenseId } = request.params;

      const result = await this.rejectStepHandler.handle({
        expenseId,
        workspaceId,
        approverId,
        comments: request.body.comments,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Step rejected successfully',
        { expenseId }
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async delegateStep(
    request: AuthenticatedRequest<{
      Params: WorkflowParams;
      Body: DelegateStepBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      // SECURITY: Use authenticated user as the delegating user
      const fromUserId = request.user.userId;
      const { workspaceId, expenseId } = request.params;

      const result = await this.delegateStepHandler.handle({
        expenseId,
        workspaceId,
        fromUserId,
        toUserId: request.body.toUserId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Step delegated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async cancelWorkflow(
    request: AuthenticatedRequest<{
      Params: WorkflowParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId } = request.params;

      const result = await this.cancelWorkflowHandler.handle({
        expenseId,
        workspaceId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Workflow cancelled successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
