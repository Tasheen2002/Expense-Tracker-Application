import { FastifyRequest, FastifyReply } from 'fastify';
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
  CancelWorkflowBody,
  WorkspaceParams,
  WorkflowParams,
  PaginationQuery,
} from '../validation/approval.schema';
import { getAuthenticatedUser } from './controller.helper';

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
    request: FastifyRequest<{
      Params: WorkflowParams;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { workspaceId, expenseId } = request.params;
    const authToken = request.headers.authorization;

    const workflow = await this.getWorkflowHandler.handle({
      actorId: user.userId,
      expenseId,
      workspaceId,
      authToken,
    });

    return ResponseHelper.ok(reply, 'Workflow retrieved successfully', workflow);
  }

  async listPendingApprovals(
    request: FastifyRequest<{
      Params: WorkspaceParams;
      Querystring: PaginationQuery;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { workspaceId } = request.params;
    const { limit, offset } = request.query;
    const authToken = request.headers.authorization;

    const result = await this.listPendingApprovalsHandler.handle({
      actorId: user.userId,
      approverId: user.userId,
      workspaceId,
      limit: limit ?? 50,
      offset: offset ?? 0,
      authToken,
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
  }

  async listUserWorkflows(
    request: FastifyRequest<{
      Params: WorkspaceParams;
      Querystring: PaginationQuery;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { workspaceId } = request.params;
    const { limit, offset } = request.query;
    const authToken = request.headers.authorization;

    const result = await this.listUserWorkflowsHandler.handle({
      actorId: user.userId,
      userId: user.userId,
      workspaceId,
      limit: limit ?? 50,
      offset: offset ?? 0,
      authToken,
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
  }

  async initiateWorkflow(
    request: FastifyRequest<{
      Params: WorkspaceParams;
      Body: InitiateWorkflowBody;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { workspaceId } = request.params;
    const authToken = request.headers.authorization;

    const result = await this.initiateWorkflowHandler.handle({
      expenseId: request.body.expenseId,
      userId: user.userId,
      workspaceId,
      authToken,
    });

    return ResponseHelper.fromCommand(
      reply,
      result,
      'Workflow initiated successfully',
      result.data ?? undefined,
      201
    );
  }

  async approveStep(
    request: FastifyRequest<{
      Params: WorkflowParams;
      Body: ApproveStepBody;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { workspaceId, expenseId } = request.params;
    const authToken = request.headers.authorization;

    const result = await this.approveStepHandler.handle({
      expenseId,
      workspaceId,
      approverId: user.userId,
      comments: request.body.comments,
      expectedStepNumber: request.body.expectedStepNumber,
      authToken,
    });

    return ResponseHelper.fromCommand(
      reply,
      result,
      'Step approved successfully',
      { expenseId }
    );
  }

  async rejectStep(
    request: FastifyRequest<{
      Params: WorkflowParams;
      Body: RejectStepBody;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { workspaceId, expenseId } = request.params;
    const authToken = request.headers.authorization;

    const result = await this.rejectStepHandler.handle({
      expenseId,
      workspaceId,
      approverId: user.userId,
      comments: request.body.comments,
      authToken,
    });

    return ResponseHelper.fromCommand(
      reply,
      result,
      'Step rejected successfully',
      { expenseId }
    );
  }

  async delegateStep(
    request: FastifyRequest<{
      Params: WorkflowParams;
      Body: DelegateStepBody;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { workspaceId, expenseId } = request.params;
    const authToken = request.headers.authorization;

    const result = await this.delegateStepHandler.handle({
      expenseId,
      workspaceId,
      fromUserId: user.userId,
      toUserId: request.body.toUserId,
      authToken,
    });

    return ResponseHelper.fromCommand(
      reply,
      result,
      'Step delegated successfully'
    );
  }

  async cancelWorkflow(
    request: FastifyRequest<{
      Params: WorkflowParams;
      Body?: CancelWorkflowBody;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { workspaceId, expenseId } = request.params;
    const reason = request.body?.reason;
    const authToken = request.headers.authorization;

    const result = await this.cancelWorkflowHandler.handle({
      expenseId,
      workspaceId,
      actorId: user.userId,
      reason,
      authToken,
    });

    return ResponseHelper.fromCommand(
      reply,
      result,
      'Workflow cancelled successfully'
    );
  }
}
