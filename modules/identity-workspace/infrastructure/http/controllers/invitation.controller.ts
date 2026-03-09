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

      if (!result.success || !result.data) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          message: result.error || 'Failed to create invitation',
        });
      }

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: 'Invitation created successfully',
        data: result.data,
      });
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
      const result = await this.getInvitationByTokenHandler.handle({
        token,
      });

      if (!result.success || !result.data) {
        return reply.status(404).send({
          success: false,
          statusCode: 404,
          error: 'Not Found',
          message: result.error || 'Invitation not found',
        });
      }

      const invitation = result.data;

      if (invitation.isExpired()) {
        return reply.status(410).send({
          success: false,
          statusCode: 410,
          error: 'Gone',
          message: 'Invitation has expired',
        });
      }

      if (invitation.isAccepted()) {
        return reply.status(410).send({
          success: false,
          statusCode: 410,
          error: 'Gone',
          message: 'Invitation has already been accepted',
        });
      }

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        data: invitation.toJSON(),
      });
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

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          error: 'Bad Request',
          message: result.error || 'Failed to accept invitation',
        });
      }

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Invitation accepted successfully',
        data: result.data,
      });
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

      if (!result.success || !result.data) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          message: result.error || 'Failed to fetch pending invitations',
        });
      }

      const paginatedResult = result.data;

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        data: {
          items: paginatedResult.items.map((inv: WorkspaceInvitation) =>
            inv.toJSON()
          ),
          pagination: {
            total: paginatedResult.total,
            limit: paginatedResult.limit,
            offset: paginatedResult.offset,
            hasMore: paginatedResult.hasMore,
          },
        },
      });
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
      await this.cancelInvitationHandler.handle({ invitationId });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Invitation cancelled successfully',
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
