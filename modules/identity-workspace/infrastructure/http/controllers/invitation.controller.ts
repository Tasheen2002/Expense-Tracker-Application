import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { CreateInvitationHandler } from '../../../application/commands/create-invitation.command';
import { AcceptInvitationHandler } from '../../../application/commands/accept-invitation.command';
import { CancelInvitationHandler } from '../../../application/commands/cancel-invitation.command';
import { GetInvitationByTokenHandler } from '../../../application/queries/get-invitation-by-token.query';
import { GetWorkspaceInvitationsHandler } from '../../../application/queries/get-workspace-invitations.query';
import { GetPendingInvitationsHandler } from '../../../application/queries/get-pending-invitations.query';
import { WorkspaceAuthHelper } from '../middleware/workspace-auth.helper';
import { WorkspaceRole } from '../../../domain/entities/workspace-membership.entity';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';
import { WorkspaceInvitation } from '../../../domain/entities/workspace-invitation.entity';

export class InvitationController {
  constructor(
    private readonly createInvitationHandler: CreateInvitationHandler,
    private readonly acceptInvitationHandler: AcceptInvitationHandler,
    private readonly cancelInvitationHandler: CancelInvitationHandler,
    private readonly getInvitationByTokenHandler: GetInvitationByTokenHandler,
    private readonly getWorkspaceInvitationsHandler: GetWorkspaceInvitationsHandler,
    private readonly getPendingInvitationsHandler: GetPendingInvitationsHandler,
    private readonly authHelper: WorkspaceAuthHelper
  ) {}

  async createInvitation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: {
        email: string;
        role: WorkspaceRole;
        expiryHours?: number;
      };
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
        role,
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

  async getInvitationByToken(
    request: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    const { token } = request.params as { token: string };

    try {
      const result = await this.getInvitationByTokenHandler.handle({ token });

      if (!result.success) {
        return ResponseHelper.fromQuery(reply, result, 'Invitation retrieved');
      }

      if (!result.data) {
        return ResponseHelper.notFound(reply, 'Invitation not found');
      }

      const invitation = result.data;

      if (invitation.isExpired()) {
        return ResponseHelper.gone(reply, 'Invitation has expired');
      }

      if (invitation.isAccepted()) {
        return ResponseHelper.gone(
          reply,
          'Invitation has already been accepted'
        );
      }

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Invitation retrieved successfully',
        invitation.toJSON()
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async acceptInvitation(
    request: AuthenticatedRequest<{ Params: { token: string } }>,
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

  async listWorkspaceInvitations(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId } = request.params;
    const { page = 1, limit = 50 } = (request.query || {}) as {
      page?: number;
      limit?: number;
    };
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

      const paginatedResult = result.data;

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Invitations retrieved successfully',
        paginatedResult
          ? {
              items: paginatedResult.items.map((inv: WorkspaceInvitation) =>
                inv.toJSON()
              ),
              pagination: {
                total: paginatedResult.total,
                limit: paginatedResult.limit,
                offset: paginatedResult.offset,
                hasMore: paginatedResult.hasMore,
              },
            }
          : undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async cancelInvitation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; invitationId: string };
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId, invitationId } = request.params;
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
      const result = await this.cancelInvitationHandler.handle({
        invitationId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Invitation cancelled successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
