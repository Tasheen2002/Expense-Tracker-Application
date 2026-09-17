import { FastifyRequest, FastifyReply } from 'fastify';
import { WorkspaceRole } from '../../../domain/entities/workspace-membership.entity';
import {
  ListWorkspaceMembersHandler,
  RemoveMemberHandler,
  ChangeMemberRoleHandler,
  GetMemberHandler,
} from '../../../application';
import { ResponseHelper } from '@shared/response.helper';
import {
  WorkspaceParams,
  MemberParams,
  UpdateMemberRoleInput,
  PaginationQuery,
} from '../validation/workspace.schema';
import { getAuthenticatedUser } from './controller.helper';

export class MemberController {
  constructor(
    private readonly listWorkspaceMembersHandler: ListWorkspaceMembersHandler,
    private readonly removeMemberHandler: RemoveMemberHandler,
    private readonly changeMemberRoleHandler: ChangeMemberRoleHandler,
    private readonly getMemberHandler: GetMemberHandler
  ) {}

  async listMembers(
    request: FastifyRequest<{ Params: WorkspaceParams; Querystring: PaginationQuery }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { page = 1, limit = 50 } = request.query;
    const result = await this.listWorkspaceMembersHandler.handle({
      workspaceId: request.params.workspaceId,
      actorId: user.userId,
      options: { limit, offset: (page - 1) * limit },
    });
    return ResponseHelper.ok(reply, 'Members retrieved successfully', result);
  }

  async getMember(
    request: FastifyRequest<{ Params: MemberParams }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const result = await this.getMemberHandler.handle({
      workspaceId: request.params.workspaceId,
      userId: request.params.userId,
      actorId: user.userId,
    });
    return ResponseHelper.ok(reply, 'Member retrieved successfully', result);
  }

  async removeMember(
    request: FastifyRequest<{ Params: MemberParams }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const result = await this.removeMemberHandler.handle({
      workspaceId: request.params.workspaceId,
      userId: request.params.userId,
      actorId: user.userId,
    });
    return ResponseHelper.fromCommand(
      reply,
      result,
      'Member removed successfully',
      undefined,
      204
    );
  }

  async changeRole(
    request: FastifyRequest<{ Params: MemberParams; Body: UpdateMemberRoleInput }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const result = await this.changeMemberRoleHandler.handle({
      workspaceId: request.params.workspaceId,
      userId: request.params.userId,
      role: request.body.role as WorkspaceRole,
      actorId: user.userId,
    });
    return ResponseHelper.fromCommand(
      reply,
      result,
      'Member role updated successfully'
    );
  }
}
