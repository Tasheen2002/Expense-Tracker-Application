import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { ListWorkspaceMembersHandler } from '../../../application/queries/list-workspace-members.query';
import { RemoveMemberHandler } from '../../../application/commands/remove-member.command';
import { ChangeMemberRoleHandler } from '../../../application/commands/change-member-role.command';
import { WorkspaceAuthHelper } from '../middleware/workspace-auth.helper';
import { WorkspaceRole } from '../../../domain/entities/workspace-membership.entity';
import { ResponseHelper } from '@shared/response.helper';

export class MemberController {
  constructor(
    private readonly listWorkspaceMembersHandler: ListWorkspaceMembersHandler,
    private readonly removeMemberHandler: RemoveMemberHandler,
    private readonly changeMemberRoleHandler: ChangeMemberRoleHandler,
    private readonly authHelper: WorkspaceAuthHelper
  ) {}

  async listMembers(
    request: AuthenticatedRequest<{ Params: { workspaceId: string } }>,
    reply: FastifyReply
  ) {
    const { workspaceId } = request.params;
    const user = request.user;

    // Check if user is a member of the workspace
    const isMember = await this.authHelper.verifyMembership(
      user.userId,
      workspaceId,
      reply
    );
    if (!isMember) {
      return; // Response already sent by helper
    }

    try {
      const result = await this.listWorkspaceMembersHandler.handle({
        workspaceId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Members retrieved successfully',
        result.data
          ? {
              items: result.data.items,
              pagination: {
                total: result.data.total,
                limit: result.data.limit,
                offset: result.data.offset,
                hasMore: result.data.hasMore,
              },
            }
          : undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async removeMember(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; userId: string };
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId, userId } = request.params;
    const currentUser = request.user;

    // Check if current user can manage members (owner or admin)
    const canManage = await this.authHelper.verifyCanManageMembers(
      currentUser.userId,
      workspaceId,
      reply
    );
    if (!canManage) {
      return; // Response already sent by helper
    }

    // Don't allow removing yourself
    if (currentUser.userId === userId) {
      return ResponseHelper.badRequest(
        reply,
        'You cannot remove yourself from the workspace'
      );
    }

    try {
      const result = await this.removeMemberHandler.handle({
        workspaceId,
        userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Member removed successfully',
        undefined,
        204
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async changeRole(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; userId: string };
      Body: { role: WorkspaceRole };
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId, userId } = request.params;
    const { role } = request.body;
    const currentUser = request.user;

    // Check if current user can manage members (owner or admin)
    const canManage = await this.authHelper.verifyCanManageMembers(
      currentUser.userId,
      workspaceId,
      reply
    );
    if (!canManage) {
      return; // Response already sent by helper
    }

    // Don't allow changing your own role
    if (currentUser.userId === userId) {
      return ResponseHelper.badRequest(reply, 'You cannot change your own role');
    }

    // Only owners can assign owner role
    if (role === WorkspaceRole.OWNER) {
      const isOwner = await this.authHelper.verifyCanDelete(
        currentUser.userId,
        workspaceId,
        reply
      );
      if (!isOwner) {
        return; // Response already sent by helper
      }
    }

    try {
      const result = await this.changeMemberRoleHandler.handle({
        workspaceId,
        userId,
        role,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Member role updated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
