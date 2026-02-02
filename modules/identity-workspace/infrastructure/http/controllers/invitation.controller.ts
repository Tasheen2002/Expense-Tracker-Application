import { FastifyReply, FastifyRequest } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { CreateInvitationHandler } from "../../../application/commands/create-invitation.command";
import { AcceptInvitationHandler } from "../../../application/commands/accept-invitation.command";
import { CancelInvitationHandler } from "../../../application/commands/cancel-invitation.command";
import {
  GetInvitationByTokenHandler,
  GetWorkspaceInvitationsHandler,
  GetPendingInvitationsHandler,
} from "../../../application/queries/get-invitation.query";
import { WorkspaceAuthHelper } from "../middleware/workspace-auth.helper";
import { WorkspaceRole } from "../../../domain/entities/workspace-membership.entity";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";

export class InvitationController {
  constructor(
    private readonly createInvitationHandler: CreateInvitationHandler,
    private readonly acceptInvitationHandler: AcceptInvitationHandler,
    private readonly cancelInvitationHandler: CancelInvitationHandler,
    private readonly getInvitationByTokenHandler: GetInvitationByTokenHandler,
    private readonly getWorkspaceInvitationsHandler: GetWorkspaceInvitationsHandler,
    private readonly getPendingInvitationsHandler: GetPendingInvitationsHandler,
    private readonly authHelper: WorkspaceAuthHelper,
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
    reply: FastifyReply,
  ) {
    const { workspaceId } = request.params;
    const { email, role, expiryHours } = request.body;
    const user = request.user;

    // Check if user can manage members (owner or admin)
    const canManage = await this.authHelper.verifyCanManageMembers(
      user.userId,
      workspaceId,
      reply,
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

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: "Invitation created successfully",
        data: result,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getInvitationByToken(
    request: FastifyRequest<{ Params: { token: string } }>,
    reply: FastifyReply,
  ) {
    const { token } = request.params;

    try {
      const invitation = await this.getInvitationByTokenHandler.handle({
        token,
      });

      if (!invitation) {
        return reply.status(404).send({
          success: false,
          statusCode: 404,
          error: "Not Found",
          message: "Invitation not found",
        });
      }

      if (invitation.isExpired()) {
        return reply.status(410).send({
          success: false,
          statusCode: 410,
          error: "Gone",
          message: "Invitation has expired",
        });
      }

      if (invitation.isAccepted()) {
        return reply.status(410).send({
          success: false,
          statusCode: 410,
          error: "Gone",
          message: "Invitation has already been accepted",
        });
      }

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        data: {
          invitationId: invitation.getId().getValue(),
          workspaceId: invitation.getWorkspaceId().getValue(),
          email: invitation.getEmail(),
          role: invitation.getRole(),
          expiresAt: invitation.getExpiresAt(),
          createdAt: invitation.getCreatedAt(),
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async acceptInvitation(
    request: AuthenticatedRequest<{ Params: { token: string } }>,
    reply: FastifyReply,
  ) {
    const { token } = request.params;
    const user = request.user;

    try {
      const result = await this.acceptInvitationHandler.handle({
        token,
        userId: user.userId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Invitation accepted successfully",
        data: result,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listWorkspaceInvitations(
    request: AuthenticatedRequest<{ Params: { workspaceId: string } }>,
    reply: FastifyReply,
  ) {
    const { workspaceId } = request.params;
    const user = request.user;

    // Check if user can manage members (owner or admin)
    const canManage = await this.authHelper.verifyCanManageMembers(
      user.userId,
      workspaceId,
      reply,
    );
    if (!canManage) {
      return; // Response already sent by helper
    }

    try {
      const invitations = await this.getPendingInvitationsHandler.handle({
        workspaceId,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        data: invitations.map((inv) => ({
          invitationId: inv.getId().getValue(),
          email: inv.getEmail(),
          role: inv.getRole(),
          expiresAt: inv.getExpiresAt(),
          createdAt: inv.getCreatedAt(),
        })),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async cancelInvitation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; invitationId: string };
    }>,
    reply: FastifyReply,
  ) {
    const { workspaceId, invitationId } = request.params;
    const user = request.user;

    // Check if user can manage members (owner or admin)
    const canManage = await this.authHelper.verifyCanManageMembers(
      user.userId,
      workspaceId,
      reply,
    );
    if (!canManage) {
      return; // Response already sent by helper
    }

    try {
      await this.cancelInvitationHandler.handle({ invitationId });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Invitation cancelled successfully",
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
