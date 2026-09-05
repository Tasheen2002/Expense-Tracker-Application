import { FastifyRequest, FastifyReply } from 'fastify';
import { WorkspaceRole } from '../../../domain/entities/workspace-membership.entity';
import {
  CreateInvitationHandler,
  AcceptInvitationHandler,
  CancelInvitationHandler,
  GetInvitationByTokenHandler,
  GetPendingInvitationsHandler,
} from '../../../application';
import { ResponseHelper } from '@shared/response.helper';
import {
  WorkspaceParams,
  InvitationParams,
  TokenParams,
  InviteMemberInput,
  PaginationQuery,
} from '../validation/workspace.schema';
import { getAuthenticatedUser } from './controller.helper';

export class InvitationController {
  constructor(
    private readonly createInvitationHandler: CreateInvitationHandler,
    private readonly acceptInvitationHandler: AcceptInvitationHandler,
    private readonly cancelInvitationHandler: CancelInvitationHandler,
    private readonly getInvitationByTokenHandler: GetInvitationByTokenHandler,
    private readonly getPendingInvitationsHandler: GetPendingInvitationsHandler
  ) {}

  async getInvitationByToken(
    request: FastifyRequest<{ Params: TokenParams }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const invitation = await this.getInvitationByTokenHandler.handle(request.params);
    if (!invitation) {
      return ResponseHelper.notFound(reply, 'Invitation not found');
    }
    if (invitation.isCancelled || invitation.isExpired || invitation.isAccepted) {
      return ResponseHelper.gone(reply, 'Invitation is no longer pending');
    }
    return ResponseHelper.ok(reply, 'Invitation retrieved successfully', invitation);
  }

  async listWorkspaceInvitations(
    request: FastifyRequest<{ Params: WorkspaceParams; Querystring: PaginationQuery }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { page = 1, limit = 50 } = request.query;
    const result = await this.getPendingInvitationsHandler.handle({
      workspaceId: request.params.workspaceId,
      actorId: user.userId,
      options: { limit, offset: (page - 1) * limit },
    });
    return ResponseHelper.ok(reply, 'Invitations retrieved successfully', result);
  }

  async createInvitation(
    request: FastifyRequest<{ Params: WorkspaceParams; Body: InviteMemberInput }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const result = await this.createInvitationHandler.handle({
      workspaceId: request.params.workspaceId,
      email: request.body.email,
      role: request.body.role as WorkspaceRole,
      expiryHours: request.body.expiryHours,
      invitedBy: user.userId,
    });
    return ResponseHelper.fromCommand(
      reply,
      result,
      'Invitation created successfully',
      undefined,
      201
    );
  }

  async acceptInvitation(
    request: FastifyRequest<{ Params: TokenParams }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const result = await this.acceptInvitationHandler.handle({
      token: request.params.token,
      userId: user.userId,
    });
    return ResponseHelper.fromCommand(reply, result, 'Invitation accepted successfully');
  }

  async cancelInvitation(
    request: FastifyRequest<{ Params: InvitationParams }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const result = await this.cancelInvitationHandler.handle({
      workspaceId: request.params.workspaceId,
      invitationId: request.params.invitationId,
      actorId: user.userId,
    });
    return ResponseHelper.fromCommand(
      reply,
      result,
      'Invitation cancelled successfully',
      undefined,
      204
    );
  }
}
