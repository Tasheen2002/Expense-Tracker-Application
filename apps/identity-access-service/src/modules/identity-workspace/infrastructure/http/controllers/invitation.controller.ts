import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  CreateInvitationHandler,
  AcceptInvitationHandler,
  CancelInvitationHandler,
  GetInvitationByTokenHandler,
  GetWorkspaceInvitationsHandler,
  GetPendingInvitationsHandler,
} from '../../../application';
import { WorkspaceAuthHelper } from '../middleware/workspace-auth.helper';
import { WorkspaceRole } from '../../../domain/entities/workspace-membership.entity';
import { ResponseHelper } from '@shared/response.helper';
import {
  workspaceParamsSchema,
  invitationParamsSchema,
  tokenParamsSchema,
  inviteMemberSchema,
  paginationQuerySchema,
} from '../validation/workspace.schema';
import { z } from 'zod';

export class InvitationController {
  constructor(
    private readonly createInvitationHandler: CreateInvitationHandler,
    private readonly acceptInvitationHandler: AcceptInvitationHandler,
    private readonly cancelInvitationHandler: CancelInvitationHandler,
    private readonly getInvitationByTokenHandler: GetInvitationByTokenHandler,
    _getWorkspaceInvitationsHandler: GetWorkspaceInvitationsHandler,
    private readonly getPendingInvitationsHandler: GetPendingInvitationsHandler,
    private readonly authHelper: WorkspaceAuthHelper
  ) {}

  async getInvitationByToken(
    request: AuthenticatedRequest<{ Params: z.infer<typeof tokenParamsSchema> }>,
    reply: FastifyReply
  ) {
    const { token } = request.params;

    try {
      const invitation = await this.getInvitationByTokenHandler.handle({ token });

      if (!invitation) {
        return ResponseHelper.notFound(reply, 'Invitation not found');
      }

      if (invitation.isExpired) {
        return ResponseHelper.gone(reply, 'Invitation has expired');
      }

      if (invitation.isAccepted) {
        return ResponseHelper.gone(
          reply,
          'Invitation has already been accepted'
        );
      }

      return ResponseHelper.ok(reply, 'Invitation retrieved successfully', invitation);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listWorkspaceInvitations(
    request: AuthenticatedRequest<{
      Params: z.infer<typeof workspaceParamsSchema>;
      Querystring: z.infer<typeof paginationQuerySchema>;
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId } = request.params;
    const { page = 1, limit = 50 } = request.query;
    const user = request.user;

    // Check if user can manage members (owner or admin)
    const canManage = await this.authHelper.verifyCanManageMembers(
      user.userId,
      workspaceId,
      reply
    );
    if (!canManage) {
      return; // Response already sent by helper
    }

    try {
      const result = await this.getPendingInvitationsHandler.handle({
        workspaceId,
        options: {
          limit: Number(limit),
          offset: (Number(page) - 1) * Number(limit),
        },
      });

      return ResponseHelper.ok(reply, 'Invitations retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async createInvitation(
    request: AuthenticatedRequest<{
      Params: z.infer<typeof workspaceParamsSchema>;
      Body: z.infer<typeof inviteMemberSchema>;
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId } = request.params;
    const { email, role, expiryHours } = request.body;
    const user = request.user;

    // Check if user can manage members (owner or admin)
    const canManage = await this.authHelper.verifyCanManageMembers(
      user.userId,
      workspaceId,
      reply
    );
    if (!canManage) {
      return; // Response already sent by helper
    }

    try {
      const result = await this.createInvitationHandler.handle({
        workspaceId,
        email,
        role: role as WorkspaceRole,
        invitedBy: user.userId,
        expiryHours,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Invitation created successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async acceptInvitation(
    request: AuthenticatedRequest<{ Params: z.infer<typeof tokenParamsSchema> }>,
    reply: FastifyReply
  ) {
    const { token } = request.params;
    const user = request.user;

    try {
      const result = await this.acceptInvitationHandler.handle({
        token,
        userId: user.userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Invitation accepted successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async cancelInvitation(
    request: AuthenticatedRequest<{
      Params: z.infer<typeof invitationParamsSchema>;
    }>,
    reply: FastifyReply
  ) {
    const { invitationId } = request.params;
    const user = request.user;

    // Wait, check if user can manage members (owner or admin)
    const { workspaceId } = request.params;
    const canManage = await this.authHelper.verifyCanManageMembers(
      user.userId,
      workspaceId,
      reply
    );
    if (!canManage) {
      return; // Response already sent by helper
    }

    try {
      const result = await this.cancelInvitationHandler.handle({
        invitationId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Invitation cancelled successfully',
        undefined,
        204
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
