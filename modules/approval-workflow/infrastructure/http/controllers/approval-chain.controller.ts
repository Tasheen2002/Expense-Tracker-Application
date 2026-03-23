import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { CreateApprovalChainHandler } from '../../../application/commands/create-approval-chain.command';
import { UpdateApprovalChainHandler } from '../../../application/commands/update-approval-chain.command';
import { DeleteApprovalChainHandler } from '../../../application/commands/delete-approval-chain.command';
import { ActivateApprovalChainHandler } from '../../../application/commands/activate-approval-chain.command';
import { DeactivateApprovalChainHandler } from '../../../application/commands/deactivate-approval-chain.command';
import { GetApprovalChainHandler } from '../../../application/queries/get-approval-chain.query';
import { ListApprovalChainsHandler } from '../../../application/queries/list-approval-chains.query';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

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

  async createChain(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: {
        name: string;
        description?: string;
        minAmount?: number;
        maxAmount?: number;
        categoryIds?: string[];
        requiresReceipt: boolean;
        approverSequence: string[];
      };
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
        result.data ? { chainId: result.data.chainId } : undefined,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateChain(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; chainId: string };
      Body: {
        name?: string;
        description?: string;
        minAmount?: number;
        maxAmount?: number;
        approverSequence?: string[];
      };
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
        'Approval chain updated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getChain(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { workspaceId, chainId } = request.params as {
        workspaceId: string;
        chainId: string;
      };

      const result = await this.getChainHandler.handle({
        chainId,
        workspaceId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Approval chain retrieved successfully',
        result.data ? result.data.toJSON() : undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listChains(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const { activeOnly, limit, offset } = request.query as {
        activeOnly?: string;
        limit?: string;
        offset?: string;
      };

      const result = await this.listChainsHandler.handle({
        workspaceId,
        activeOnly: activeOnly === 'true',
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Approval chains retrieved successfully',
        result.data
          ? {
              items: result.data.items.map((chain) => chain.toJSON()),
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

  async activateChain(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; chainId: string };
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
      Params: { workspaceId: string; chainId: string };
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
      Params: { workspaceId: string; chainId: string };
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
        'Approval chain deleted successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
