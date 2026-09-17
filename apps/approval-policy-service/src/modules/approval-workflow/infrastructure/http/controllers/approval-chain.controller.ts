import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateApprovalChainHandler } from '../../../application/commands/create-approval-chain.command';
import { UpdateApprovalChainHandler } from '../../../application/commands/update-approval-chain.command';
import { DeleteApprovalChainHandler } from '../../../application/commands/delete-approval-chain.command';
import { ActivateApprovalChainHandler } from '../../../application/commands/activate-approval-chain.command';
import { DeactivateApprovalChainHandler } from '../../../application/commands/deactivate-approval-chain.command';
import { GetApprovalChainHandler } from '../../../application/queries/get-approval-chain.query';
import { ListApprovalChainsHandler } from '../../../application/queries/list-approval-chains.query';
import { ResponseHelper } from '@shared/response.helper';
import {
  CreateChainBody,
  UpdateChainBody,
  ListChainsQuery,
  WorkspaceParams,
  ChainParams,
} from '../validation/approval.schema';
import { getAuthenticatedUser } from './controller.helper';

export class ApprovalChainController {
  constructor(
    private readonly createChainHandler: CreateApprovalChainHandler,
    private readonly updateChainHandler: UpdateApprovalChainHandler,
    private readonly deleteChainHandler: DeleteApprovalChainHandler,
    private readonly getChainHandler: GetApprovalChainHandler,
    private readonly listChainsHandler: ListApprovalChainsHandler,
    private readonly activateChainHandler: ActivateApprovalChainHandler,
    private readonly deactivateChainHandler: DeactivateApprovalChainHandler
  ) {}

  async getChain(
    request: FastifyRequest<{
      Params: ChainParams;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { workspaceId, chainId } = request.params;
    const authToken = request.headers.authorization;

    const chain = await this.getChainHandler.handle({
      actorId: user.userId,
      chainId,
      workspaceId,
      authToken,
    });

    return ResponseHelper.ok(reply, 'Approval chain retrieved successfully', chain);
  }

  async listChains(
    request: FastifyRequest<{
      Params: WorkspaceParams;
      Querystring: ListChainsQuery;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { workspaceId } = request.params;
    const { activeOnly, limit, offset } = request.query;
    const authToken = request.headers.authorization;

    const result = await this.listChainsHandler.handle({
      actorId: user.userId,
      workspaceId,
      activeOnly: activeOnly ?? false,
      limit: limit ?? 50,
      offset: offset ?? 0,
      authToken,
    });

    return ResponseHelper.ok(reply, 'Approval chains retrieved successfully', {
      items: result.items,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      },
    });
  }

  async createChain(
    request: FastifyRequest<{
      Params: WorkspaceParams;
      Body: CreateChainBody;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { workspaceId } = request.params;
    const authToken = request.headers.authorization;

    const result = await this.createChainHandler.handle({
      actorId: user.userId,
      workspaceId,
      authToken,
      ...request.body,
    });

    return ResponseHelper.fromCommand(
      reply,
      result,
      'Approval chain created successfully',
      result.data ?? undefined,
      201
    );
  }

  async updateChain(
    request: FastifyRequest<{
      Params: ChainParams;
      Body: UpdateChainBody;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { workspaceId, chainId } = request.params;
    const authToken = request.headers.authorization;

    const result = await this.updateChainHandler.handle({
      actorId: user.userId,
      chainId,
      workspaceId,
      authToken,
      ...request.body,
    });

    return ResponseHelper.fromCommand(
      reply,
      result,
      'Approval chain updated successfully',
      { chainId }
    );
  }

  async activateChain(
    request: FastifyRequest<{
      Params: ChainParams;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { workspaceId, chainId } = request.params;
    const authToken = request.headers.authorization;

    const result = await this.activateChainHandler.handle({
      actorId: user.userId,
      chainId,
      workspaceId,
      authToken,
    });

    return ResponseHelper.fromCommand(
      reply,
      result,
      'Approval chain activated successfully'
    );
  }

  async deactivateChain(
    request: FastifyRequest<{
      Params: ChainParams;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { workspaceId, chainId } = request.params;
    const authToken = request.headers.authorization;

    const result = await this.deactivateChainHandler.handle({
      actorId: user.userId,
      chainId,
      workspaceId,
      authToken,
    });

    return ResponseHelper.fromCommand(
      reply,
      result,
      'Approval chain deactivated successfully'
    );
  }

  async deleteChain(
    request: FastifyRequest<{
      Params: ChainParams;
    }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = getAuthenticatedUser(request);
    const { workspaceId, chainId } = request.params;
    const authToken = request.headers.authorization;

    const result = await this.deleteChainHandler.handle({
      actorId: user.userId,
      chainId,
      workspaceId,
      authToken,
    });

    return ResponseHelper.fromCommand(
      reply,
      result,
      'Approval chain deleted successfully',
      undefined,
      204
    );
  }
}
