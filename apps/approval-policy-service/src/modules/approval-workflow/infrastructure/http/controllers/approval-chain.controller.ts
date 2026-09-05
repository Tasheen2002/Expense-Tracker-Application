import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
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
    request: AuthenticatedRequest<{
      Params: ChainParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, chainId } = request.params;

      const chain = await this.getChainHandler.handle({
        chainId,
        workspaceId,
      });

      return ResponseHelper.ok(reply, 'Approval chain retrieved successfully', chain);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listChains(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Querystring: ListChainsQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { activeOnly, limit, offset } = request.query;

      const result = await this.listChainsHandler.handle({
        workspaceId,
        activeOnly: activeOnly ?? false,
        limit: limit ?? 50,
        offset: offset ?? 0,
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
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async createChain(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Body: CreateChainBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;

      const result = await this.createChainHandler.handle({
        workspaceId,
        ...request.body,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Approval chain created successfully',
        result.data ?? undefined,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateChain(
    request: AuthenticatedRequest<{
      Params: ChainParams;
      Body: UpdateChainBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, chainId } = request.params;

      const result = await this.updateChainHandler.handle({
        chainId,
        workspaceId,
        ...request.body,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Approval chain updated successfully',
        { chainId }
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateChain(
    request: AuthenticatedRequest<{
      Params: ChainParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, chainId } = request.params;
      const result = await this.activateChainHandler.handle({
        chainId,
        workspaceId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Approval chain activated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deactivateChain(
    request: AuthenticatedRequest<{
      Params: ChainParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, chainId } = request.params;
      const result = await this.deactivateChainHandler.handle({
        chainId,
        workspaceId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Approval chain deactivated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteChain(
    request: AuthenticatedRequest<{
      Params: ChainParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, chainId } = request.params;
      const result = await this.deleteChainHandler.handle({
        chainId,
        workspaceId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Approval chain deleted successfully',
        undefined,
        204
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
