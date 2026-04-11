import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { CreateWorkspaceHandler } from '../../../application/commands/create-workspace.command';
import { UpdateWorkspaceHandler } from '../../../application/commands/update-workspace.command';
import { DeleteWorkspaceHandler } from '../../../application/commands/delete-workspace.command';
import { GetWorkspaceByIdHandler } from '../../../application/queries/get-workspace-by-id.query';
import { GetUserWorkspacesHandler } from '../../../application/queries/get-user-workspaces.query';
import { WorkspaceAuthHelper } from '../middleware/workspace-auth.helper';
import { ResponseHelper } from '@shared/response.helper';

export class WorkspaceController {
  constructor(
    private readonly createWorkspaceHandler: CreateWorkspaceHandler,
    private readonly updateWorkspaceHandler: UpdateWorkspaceHandler,
    private readonly deleteWorkspaceHandler: DeleteWorkspaceHandler,
    private readonly getWorkspaceByIdHandler: GetWorkspaceByIdHandler,
    private readonly getUserWorkspacesHandler: GetUserWorkspacesHandler,
    private readonly authHelper: WorkspaceAuthHelper
  ) {}

  async createWorkspace(
    request: AuthenticatedRequest<{ Body: { name: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { name } = request.body;
      const user = request.user;

      const result = await this.createWorkspaceHandler.handle({
        name,
        ownerId: user.userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Workspace created successfully',
        result.data,
        201
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getWorkspace(
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
      const result = await this.getWorkspaceByIdHandler.handle({
        workspaceId,
      });

      return ResponseHelper.ok(reply, 'Workspace retrieved successfully', result);
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getUserWorkspaces(
    request: AuthenticatedRequest<{
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ) {
    const user = request.user;
    const { page = 1, limit = 50 } = (request.query || {}) as {
      page?: number;
      limit?: number;
    };

    try {
      const result = await this.getUserWorkspacesHandler.handle({
        userId: user.userId,
        options: {
          limit: Number(limit),
          offset: (Number(page) - 1) * Number(limit),
        },
      });

      return ResponseHelper.ok(reply, 'Workspaces retrieved successfully', {
        items: result.items,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateWorkspace(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: { name?: string };
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId } = request.params;
    const { name } = request.body;
    const user = request.user;

    // Check if user can edit the workspace (owner or admin)
    const canEdit = await this.authHelper.verifyCanEdit(
      user.userId,
      workspaceId,
      reply
    );
    if (!canEdit) {
      return; // Response already sent by helper
    }

    try {
      const result = await this.updateWorkspaceHandler.handle({
        workspaceId,
        name,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Workspace updated successfully',
        result.data
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteWorkspace(
    request: AuthenticatedRequest<{ Params: { workspaceId: string } }>,
    reply: FastifyReply
  ) {
    const { workspaceId } = request.params;
    const user = request.user;

    // Check if user can delete the workspace (owner only)
    const canDelete = await this.authHelper.verifyCanDelete(
      user.userId,
      workspaceId,
      reply
    );
    if (!canDelete) {
      return; // Response already sent by helper
    }

    try {
      const result = await this.deleteWorkspaceHandler.handle({
        workspaceId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Workspace deleted successfully',
        undefined,
        204
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
