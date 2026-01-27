import { ApprovalChainRepository } from '../../domain/repositories/approval-chain.repository'
import { ApprovalChain } from '../../domain/entities/approval-chain.entity'

export interface CreateApprovalChainInput {
  workspaceId: string
  name: string
  description?: string
  minAmount?: number
  maxAmount?: number
  categoryIds?: string[]
  requiresReceipt: boolean
  approverSequence: string[]
}

export class CreateApprovalChainHandler {
  constructor(
    private readonly approvalChainRepository: ApprovalChainRepository
  ) {}

  async handle(input: CreateApprovalChainInput): Promise<ApprovalChain> {
    const chain = ApprovalChain.create({
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      minAmount: input.minAmount,
      maxAmount: input.maxAmount,
      categoryIds: input.categoryIds,
      requiresReceipt: input.requiresReceipt,
      approverSequence: input.approverSequence,
    })

    await this.approvalChainRepository.save(chain)

    return chain
  }
}
