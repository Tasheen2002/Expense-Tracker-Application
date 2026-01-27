import { FastifyRequest, FastifyReply } from 'fastify'
import { ApprovalChainService } from '../../../application/services/approval-chain.service'
import { ApprovalChain } from '../../../domain/entities/approval-chain.entity'
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper'

export class ApprovalChainController {
  constructor(
    private readonly approvalChainService: ApprovalChainService
  ) {}

  async createChain(
    request: FastifyRequest<{
      Params: { workspaceId: string }
      Body: {
        name: string
        description?: string
        minAmount?: number
        maxAmount?: number
        categoryIds?: string[]
        requiresReceipt: boolean
        approverSequence: string[]
      }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params

      const chain = await this.approvalChainService.createChain({
        workspaceId,
        ...request.body,
      })

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: 'Approval chain created successfully',
        data: this.serializeChain(chain),
      })
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
    }
  }

  async updateChain(
    request: FastifyRequest<{
      Params: { workspaceId: string; chainId: string }
      Body: {
        name?: string
        description?: string
        minAmount?: number
        maxAmount?: number
        approverSequence?: string[]
      }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, chainId } = request.params

      const chain = await this.approvalChainService.updateChain({
        chainId,
        workspaceId,
        ...request.body,
      })

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Approval chain updated successfully',
        data: this.serializeChain(chain),
      })
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
    }
  }

  async getChain(
    request: FastifyRequest<{
      Params: { workspaceId: string; chainId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, chainId } = request.params

      const chain = await this.approvalChainService.getChain(chainId, workspaceId)

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Approval chain retrieved successfully',
        data: this.serializeChain(chain),
      })
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
    }
  }

  async listChains(
    request: FastifyRequest<{
      Params: { workspaceId: string }
      Querystring: { activeOnly?: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params
      const activeOnly = request.query.activeOnly === 'true'

      const chains = await this.approvalChainService.listChains(workspaceId, activeOnly)

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Approval chains retrieved successfully',
        data: chains.map(chain => this.serializeChain(chain)),
      })
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
    }
  }

  async activateChain(
    request: FastifyRequest<{
      Params: { workspaceId: string; chainId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, chainId } = request.params

      const chain = await this.approvalChainService.activateChain(chainId, workspaceId)

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Approval chain activated successfully',
        data: this.serializeChain(chain),
      })
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
    }
  }

  async deactivateChain(
    request: FastifyRequest<{
      Params: { workspaceId: string; chainId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, chainId } = request.params

      const chain = await this.approvalChainService.deactivateChain(chainId, workspaceId)

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Approval chain deactivated successfully',
        data: this.serializeChain(chain),
      })
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
    }
  }

  async deleteChain(
    request: FastifyRequest<{
      Params: { workspaceId: string; chainId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, chainId } = request.params

      await this.approvalChainService.deleteChain(chainId, workspaceId)

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Approval chain deleted successfully',
      })
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error)
    }
  }

  private serializeChain(chain: ApprovalChain) {
    return {
      chainId: chain.getId().getValue(),
      workspaceId: chain.getWorkspaceId(),
      name: chain.getName(),
      description: chain.getDescription(),
      minAmount: chain.getMinAmount(),
      maxAmount: chain.getMaxAmount(),
      categoryIds: chain.getCategoryIds(),
      requiresReceipt: chain.requiresReceipt(),
      approverSequence: chain.getApproverSequence(),
      isActive: chain.isActive(),
      createdAt: chain.getCreatedAt().toISOString(),
      updatedAt: chain.getUpdatedAt().toISOString(),
    }
  }
}
