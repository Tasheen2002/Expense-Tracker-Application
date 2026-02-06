import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { ApprovalChainService } from "../../../application/services/approval-chain.service";
import { ApprovalChain } from "../../../domain/entities/approval-chain.entity";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";

export class ApprovalChainController {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

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
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;

      const chain = await this.approvalChainService.createChain({
        workspaceId,
        ...request.body,
      });

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: "Approval chain created successfully",
        data: this.serializeChain(chain),
      });
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
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, chainId } = request.params;

      const chain = await this.approvalChainService.updateChain({
        chainId,
        workspaceId,
        ...request.body,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Approval chain updated successfully",
        data: this.serializeChain(chain),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getChain(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; chainId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, chainId } = request.params;

      const chain = await this.approvalChainService.getChain(
        chainId,
        workspaceId,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Approval chain retrieved successfully",
        data: this.serializeChain(chain),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listChains(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { activeOnly?: string; limit?: string; offset?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const activeOnly = request.query.activeOnly === "true";
      const { limit, offset } = request.query;

      const result = await this.approvalChainService.listChains(
        workspaceId,
        activeOnly,
        {
          limit: limit ? parseInt(limit, 10) : 50,
          offset: offset ? parseInt(offset, 10) : 0,
        },
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Approval chains retrieved successfully",
        data: {
          items: result.items.map((chain) => this.serializeChain(chain)),
          pagination: {
            total: result.total,
            limit: result.limit,
            offset: result.offset,
            hasMore: result.hasMore,
          },
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateChain(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; chainId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, chainId } = request.params;

      const chain = await this.approvalChainService.activateChain(
        chainId,
        workspaceId,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Approval chain activated successfully",
        data: this.serializeChain(chain),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deactivateChain(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; chainId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, chainId } = request.params;

      const chain = await this.approvalChainService.deactivateChain(
        chainId,
        workspaceId,
      );

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Approval chain deactivated successfully",
        data: this.serializeChain(chain),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteChain(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; chainId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, chainId } = request.params;

      await this.approvalChainService.deleteChain(chainId, workspaceId);

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Approval chain deleted successfully",
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  private serializeChain(chain: ApprovalChain) {
    return {
      chainId: chain.getId().getValue(),
      workspaceId: chain.getWorkspaceId().getValue(),
      name: chain.getName(),
      description: chain.getDescription(),
      minAmount: chain.getMinAmount(),
      maxAmount: chain.getMaxAmount(),
      categoryIds: chain.getCategoryIds()?.map((id) => id.getValue()),
      requiresReceipt: chain.requiresReceipt(),
      approverSequence: chain.getApproverSequence().map((id) => id.getValue()),
      isActive: chain.isActive(),
      createdAt: chain.getCreatedAt().toISOString(),
      updatedAt: chain.getUpdatedAt().toISOString(),
    };
  }
}
