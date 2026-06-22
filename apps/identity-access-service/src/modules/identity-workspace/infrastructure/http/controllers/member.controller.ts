import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  ListWorkspaceMembersHandler,
  RemoveMemberHandler,
  ChangeMemberRoleHandler,
} from '../../../application';
import { WorkspaceAuthHelper } from '../middleware/workspace-auth.helper';
import { WorkspaceRole } from '../../../domain/entities/workspace-membership.entity';
import { ResponseHelper } from '@shared/response.helper';
import {
  workspaceParamsSchema,
  memberParamsSchema,
  updateMemberRoleSchema,
} from '../validation/workspace.schema';
import { z } from 'zod';

export class MemberController {
  constructor(
    private readonly listWorkspaceMembersHandler: ListWorkspaceMembersHandler,
    private readonly removeMemberHandler: RemoveMemberHandler,
    private readonly changeMemberRoleHandler: ChangeMemberRoleHandler,
    private readonly authHelper: WorkspaceAuthHelper
  ) {}

  async listMembers(
    request: AuthenticatedRequest<{ Params: z.infer<typeof workspaceParamsSchema> }>,
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

      return ResponseHelper.ok(reply, 'Members retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async removeMember(
    request: AuthenticatedRequest<{
      Params: z.infer<typeof memberParamsSchema>;
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
      Params: z.infer<typeof memberParamsSchema>;
      Body: z.infer<typeof updateMemberRoleSchema>;
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
        role: role as WorkspaceRole,
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

  async getMember(
    request: FastifyRequest<{ Params: { workspaceId: string; userId: string } }>,
    reply: FastifyReply
  ) {
    const { workspaceId, userId } = request.params;
    try {
      const membership = await this.authHelper.getUserMembership(userId, workspaceId);
      if (!membership) {
        return ResponseHelper.notFound(reply, 'Member not found');
      }
      return ResponseHelper.ok(reply, 'Member retrieved successfully', {
        role: membership.role,
        workspaceId: membership.workspaceId,
        userId: membership.userId,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
