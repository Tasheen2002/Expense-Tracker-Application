import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { CreateWorkspaceHandler } from '../../../application/commands/create-workspace.command';
import { UpdateWorkspaceHandler } from '../../../application/commands/update-workspace.command';
import { DeleteWorkspaceHandler } from '../../../application/commands/delete-workspace.command';
import { GetWorkspaceByIdHandler } from '../../../application/queries/get-workspace-by-id.query';
import { GetUserWorkspacesHandler } from '../../../application/queries/get-user-workspaces.query';
import { WorkspaceAuthHelper } from '../middleware/workspace-auth.helper';
import { Workspace } from '../../../domain/entities/workspace.entity';

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
    const { name } = request.body;
    const user = request.user;

    const result = await this.createWorkspaceHandler.handle({
      name,
      ownerId: user.userId,
    });

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        error: 'Bad Request',
        message: result.error || 'Failed to create workspace',
        details: result.errors,
      });
    }

    const workspace = result.data;
    if (!workspace) {
      return reply.status(500).send({
        success: false,
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to create workspace',
      });
    }

    return reply.status(201).send({
      success: true,
      statusCode: 201,
      message: 'Workspace created successfully',
      data: workspace.toJSON(),
    });
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

    const result = await this.getWorkspaceByIdHandler.handle({
      workspaceId,
    });

    if (!result.success || !result.data) {
      return reply.status(404).send({
        success: false,
        statusCode: 404,
        error: 'Not Found',
        message: result.error || 'Workspace not found',
      });
    }

    const workspace = result.data;

    return reply.status(200).send({
      success: true,
      statusCode: 200,
      data: workspace.toJSON(),
    });
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

    const result = await this.getUserWorkspacesHandler.handle({
      userId: user.userId,
      options: {
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
      },
    });

    if (!result.success || !result.data) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        error: 'Bad Request',
        message: result.error || 'Failed to fetch user workspaces',
      });
    }

    const paginatedResult = result.data;

    return reply.status(200).send({
      success: true,
      statusCode: 200,
      data: {
        items: paginatedResult.items.map((workspace: Workspace) =>
          workspace.toJSON()
        ),
        pagination: {
          total: paginatedResult.total,
          limit: paginatedResult.limit,
          offset: paginatedResult.offset,
          hasMore: paginatedResult.hasMore,
        },
      },
    });
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

    const result = await this.updateWorkspaceHandler.handle({
      workspaceId,
      name,
    });

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        error: 'Bad Request',
        message: result.error || 'Failed to update workspace',
      });
    }

    const workspace = result.data;
    if (!workspace) {
      return reply.status(404).send({
        success: false,
        statusCode: 404,
        error: 'Not Found',
        message: 'Workspace not found',
      });
    }

    return reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Workspace updated successfully',
      data: workspace.toJSON(),
    });
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

    const result = await this.deleteWorkspaceHandler.handle({
      workspaceId,
    });

    if (!result.success) {
      return reply.status(404).send({
        success: false,
        statusCode: 404,
        error: 'Not Found',
        message: result.error || 'Workspace not found',
      });
    }

    return reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Workspace deleted successfully',
    });
  }
}
