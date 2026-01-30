import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { CreateWorkspaceHandler } from "../../../application/commands/create-workspace.command";
import { UpdateWorkspaceHandler } from "../../../application/commands/update-workspace.command";
import { DeleteWorkspaceHandler } from "../../../application/commands/delete-workspace.command";
import {
  GetWorkspaceByIdHandler,
  GetUserWorkspacesHandler,
} from "../../../application/queries/get-workspace.query";
import { WorkspaceAuthHelper } from "../middleware/workspace-auth.helper";

export class WorkspaceController {
  constructor(
    private readonly createWorkspaceHandler: CreateWorkspaceHandler,
    private readonly updateWorkspaceHandler: UpdateWorkspaceHandler,
    private readonly deleteWorkspaceHandler: DeleteWorkspaceHandler,
    private readonly getWorkspaceByIdHandler: GetWorkspaceByIdHandler,
    private readonly getUserWorkspacesHandler: GetUserWorkspacesHandler,
    private readonly authHelper: WorkspaceAuthHelper,
  ) {}

  async createWorkspace(
    request: AuthenticatedRequest<{ Body: { name: string } }>,
    reply: FastifyReply,
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
        error: "Bad Request",
        message: result.error || "Failed to create workspace",
        details: result.errors,
      });
    }

    const workspace = result.data;
    if (!workspace) {
      return reply.status(500).send({
        success: false,
        statusCode: 500,
        error: "Internal Server Error",
        message: "Failed to create workspace",
      });
    }

    return reply.status(201).send({
      success: true,
      statusCode: 201,
      message: "Workspace created successfully",
      data: {
        workspaceId: workspace.getId().getValue(),
        name: workspace.getName(),
        slug: workspace.getSlug(),
        ownerId: workspace.getOwnerId().getValue(),
        isActive: workspace.getIsActive(),
        createdAt: workspace.getCreatedAt(),
        updatedAt: workspace.getUpdatedAt(),
      },
    });
  }

  async getWorkspace(
    request: AuthenticatedRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const { id } = request.params;
    const user = request.user;

    // Check if user is a member of the workspace
    const isMember = await this.authHelper.verifyMembership(
      user.userId,
      id,
      reply,
    );
    if (!isMember) {
      return; // Response already sent by helper
    }

    const workspace = await this.getWorkspaceByIdHandler.handle({
      workspaceId: id,
    });

    if (!workspace) {
      return reply.status(404).send({
        success: false,
        statusCode: 404,
        error: "Not Found",
        message: "Workspace not found",
      });
    }

    return reply.status(200).send({
      success: true,
      statusCode: 200,
      data: {
        workspaceId: workspace.getId().getValue(),
        name: workspace.getName(),
        slug: workspace.getSlug(),
        ownerId: workspace.getOwnerId().getValue(),
        isActive: workspace.getIsActive(),
        createdAt: workspace.getCreatedAt(),
        updatedAt: workspace.getUpdatedAt(),
      },
    });
  }

  async getUserWorkspaces(request: AuthenticatedRequest, reply: FastifyReply) {
    const user = request.user;

    const workspaces = await this.getUserWorkspacesHandler.handle({
      userId: user.userId,
    });

    return reply.status(200).send({
      success: true,
      statusCode: 200,
      data: workspaces.map((workspace) => ({
        workspaceId: workspace.getId().getValue(),
        name: workspace.getName(),
        slug: workspace.getSlug(),
        ownerId: workspace.getOwnerId().getValue(),
        isActive: workspace.getIsActive(),
        createdAt: workspace.getCreatedAt(),
        updatedAt: workspace.getUpdatedAt(),
      })),
    });
  }

  async updateWorkspace(
    request: AuthenticatedRequest<{
      Params: { id: string };
      Body: { name?: string };
    }>,
    reply: FastifyReply,
  ) {
    const { id } = request.params;
    const { name } = request.body;
    const user = request.user;

    // Check if user can edit the workspace (owner or admin)
    const canEdit = await this.authHelper.verifyCanEdit(user.userId, id, reply);
    if (!canEdit) {
      return; // Response already sent by helper
    }

    const result = await this.updateWorkspaceHandler.handle({
      workspaceId: id,
      name,
    });

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        error: "Bad Request",
        message: result.error || "Failed to update workspace",
      });
    }

    const workspace = result.data;
    if (!workspace) {
      return reply.status(404).send({
        success: false,
        statusCode: 404,
        error: "Not Found",
        message: "Workspace not found",
      });
    }

    return reply.status(200).send({
      success: true,
      statusCode: 200,
      message: "Workspace updated successfully",
      data: {
        workspaceId: workspace.getId().getValue(),
        name: workspace.getName(),
        slug: workspace.getSlug(),
        ownerId: workspace.getOwnerId().getValue(),
        isActive: workspace.getIsActive(),
        createdAt: workspace.getCreatedAt(),
        updatedAt: workspace.getUpdatedAt(),
      },
    });
  }

  async deleteWorkspace(
    request: AuthenticatedRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const { id } = request.params;
    const user = request.user;

    // Check if user can delete the workspace (owner only)
    const canDelete = await this.authHelper.verifyCanDelete(
      user.userId,
      id,
      reply,
    );
    if (!canDelete) {
      return; // Response already sent by helper
    }

    const result = await this.deleteWorkspaceHandler.handle({
      workspaceId: id,
    });

    if (!result.success) {
      return reply.status(404).send({
        success: false,
        statusCode: 404,
        error: "Not Found",
        message: result.error || "Workspace not found",
      });
    }

    return reply.status(200).send({
      success: true,
      statusCode: 200,
      message: "Workspace deleted successfully",
    });
  }
}
