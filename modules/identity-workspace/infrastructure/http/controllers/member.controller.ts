import { FastifyRequest, FastifyReply } from "fastify";
import { WorkspaceMembershipService } from "../../../application/services/workspace-membership.service";
import { WorkspaceAuthHelper } from "../middleware/workspace-auth.helper";
import { WorkspaceRole } from "../../../domain/entities/workspace-membership.entity";

export class MemberController {
  constructor(
    private readonly membershipService: WorkspaceMembershipService,
    private readonly authHelper: WorkspaceAuthHelper,
  ) {}

  async listMembers(request: FastifyRequest, reply: FastifyReply) {
    const { workspaceId } = request.params as { workspaceId: string };
    const user = this.authHelper.getUserFromRequest(request);

    if (!user) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    // Check if user is a member of the workspace
    const isMember = await this.authHelper.verifyMembership(
      user.userId,
      workspaceId,
      reply,
    );
    if (!isMember) {
      return; // Response already sent by helper
    }

    const members =
      await this.membershipService.getWorkspaceMembers(workspaceId);

    return reply.status(200).send({
      success: true,
      statusCode: 200,
      data: members.map((member) => ({
        membershipId: member.getId().getValue(),
        userId: member.getUserId().getValue(),
        workspaceId: member.getWorkspaceId().getValue(),
        role: member.getRole(),
        createdAt: member.getCreatedAt(),
        updatedAt: member.getUpdatedAt(),
      })),
    });
  }

  async removeMember(request: FastifyRequest, reply: FastifyReply) {
    const { workspaceId, userId } = request.params as {
      workspaceId: string;
      userId: string;
    };
    const currentUser = this.authHelper.getUserFromRequest(request);

    if (!currentUser) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    // Check if current user can manage members (owner or admin)
    const canManage = await this.authHelper.verifyCanManageMembers(
      currentUser.userId,
      workspaceId,
      reply,
    );
    if (!canManage) {
      return; // Response already sent by helper
    }

    // Don't allow removing yourself
    if (currentUser.userId === userId) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        error: "Bad Request",
        message: "You cannot remove yourself from the workspace",
      });
    }

    try {
      // FIX: Lookup membership first
      const membership = await this.membershipService.getUserMembership(
        userId,
        workspaceId,
      );
      if (!membership) {
        return reply.status(404).send({
          success: false,
          statusCode: 404,
          message: "Member not found in this workspace",
        });
      }

      await this.membershipService.removeMember(membership.getId().getValue());

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Member removed successfully",
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        error: "Bad Request",
        message:
          error instanceof Error ? error.message : "Failed to remove member",
      });
    }
  }

  async changeRole(request: FastifyRequest, reply: FastifyReply) {
    const { workspaceId, userId } = request.params as {
      workspaceId: string;
      userId: string;
    };
    const { role } = request.body as { role: WorkspaceRole };
    const currentUser = this.authHelper.getUserFromRequest(request);

    if (!currentUser) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    // Check if current user can manage members (owner or admin)
    const canManage = await this.authHelper.verifyCanManageMembers(
      currentUser.userId,
      workspaceId,
      reply,
    );
    if (!canManage) {
      return; // Response already sent by helper
    }

    // Don't allow changing your own role
    if (currentUser.userId === userId) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        error: "Bad Request",
        message: "You cannot change your own role",
      });
    }

    // Only owners can assign owner role
    if (role === WorkspaceRole.OWNER) {
      const isOwner = await this.authHelper.verifyCanDelete(
        currentUser.userId,
        workspaceId,
        reply,
      );
      if (!isOwner) {
        return reply.status(403).send({
          success: false,
          statusCode: 403,
          error: "Forbidden",
          message: "Only workspace owners can assign the owner role",
        });
      }
    }

    try {
      // FIX: Lookup membership first
      const membership = await this.membershipService.getUserMembership(
        userId,
        workspaceId,
      );
      if (!membership) {
        return reply.status(404).send({
          success: false,
          statusCode: 404,
          message: "Member not found in this workspace",
        });
      }

      const updatedMembership = await this.membershipService.changeMemberRole(
        membership.getId().getValue(),
        role,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Member role updated successfully",
        data: {
          membershipId: updatedMembership.getId().getValue(),
          userId: updatedMembership.getUserId().getValue(),
          workspaceId: updatedMembership.getWorkspaceId().getValue(),
          role: updatedMembership.getRole(),
          updatedAt: updatedMembership.getUpdatedAt(),
        },
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        error: "Bad Request",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update member role",
      });
    }
  }
}
