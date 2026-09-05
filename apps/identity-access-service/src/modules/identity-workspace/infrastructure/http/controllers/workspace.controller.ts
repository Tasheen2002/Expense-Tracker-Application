import { FastifyRequest, FastifyReply } from 'fastify';
import {
  CreateWorkspaceHandler,
  UpdateWorkspaceHandler,
  DeleteWorkspaceHandler,
  GetWorkspaceByIdHandler,
  GetUserWorkspacesHandler,
  TransferOwnershipHandler,
} from '../../../application';
import { ResponseHelper } from '@shared/response.helper';
import {
  WorkspaceParams,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  TransferOwnershipInput,
  PaginationQuery,
} from '../validation/workspace.schema';
import { getAuthenticatedUser } from './controller.helper';

export class WorkspaceController {
  constructor(
    private readonly createWorkspaceHandler: CreateWorkspaceHandler,
    private readonly updateWorkspaceHandler: UpdateWorkspaceHandler,
    private readonly deleteWorkspaceHandler: DeleteWorkspaceHandler,
    private readonly getWorkspaceByIdHandler: GetWorkspaceByIdHandler,
    private readonly getUserWorkspacesHandler: GetUserWorkspacesHandler,
    private readonly transferOwnershipHandler: TransferOwnershipHandler
  ) {}

  async getWorkspace(
    request: FastifyRequest<{ Params: WorkspaceParams }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const result = await this.getWorkspaceByIdHandler.handle({
      workspaceId: request.params.workspaceId,
      actorId: user.userId,
    });
    return ResponseHelper.ok(reply, 'Workspace retrieved successfully', result);
  }

  async getUserWorkspaces(
    request: FastifyRequest<{ Querystring: PaginationQuery }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { page = 1, limit = 50 } = request.query;
    const result = await this.getUserWorkspacesHandler.handle({
      userId: user.userId,
      options: { limit, offset: (page - 1) * limit },
    });
    return ResponseHelper.ok(reply, 'Workspaces retrieved successfully', result);
  }

  async createWorkspace(
    request: FastifyRequest<{ Body: CreateWorkspaceInput }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const result = await this.createWorkspaceHandler.handle({
      name: request.body.name,
      ownerId: user.userId,
    });
    return ResponseHelper.fromCommand(
      reply,
      result,
      'Workspace created successfully',
      undefined,
      201
    );
  }

  async updateWorkspace(
    request: FastifyRequest<{ Params: WorkspaceParams; Body: UpdateWorkspaceInput }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const result = await this.updateWorkspaceHandler.handle({
      workspaceId: request.params.workspaceId,
      name: request.body.name,
      actorId: user.userId,
    });
    return ResponseHelper.fromCommand(reply, result, 'Workspace updated successfully');
  }

  async deleteWorkspace(
    request: FastifyRequest<{ Params: WorkspaceParams }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const result = await this.deleteWorkspaceHandler.handle({
      workspaceId: request.params.workspaceId,
      actorId: user.userId,
    });
    return ResponseHelper.fromCommand(
      reply,
      result,
      'Workspace deleted successfully',
      undefined,
      204
    );
  }

  async transferOwnership(
    request: FastifyRequest<{ Params: WorkspaceParams; Body: TransferOwnershipInput }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const result = await this.transferOwnershipHandler.handle({
      workspaceId: request.params.workspaceId,
      newOwnerId: request.body.newOwnerId,
      actorId: user.userId,
    });
    return ResponseHelper.fromCommand(reply, result, 'Workspace ownership transferred');
  }
}
