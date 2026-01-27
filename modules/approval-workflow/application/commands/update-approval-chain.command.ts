import { ApprovalChainRepository } from '../../domain/repositories/approval-chain.repository'
import { ApprovalChain } from '../../domain/entities/approval-chain.entity'
import { ApprovalChainId } from '../../domain/value-objects/approval-chain-id'
import { ApprovalChainNotFoundError } from '../../domain/errors/approval-workflow.errors'

export interface UpdateApprovalChainInput {
  chainId: string
  workspaceId: string
  name?: string
  description?: string
  minAmount?: number
  maxAmount?: number
  approverSequence?: string[]
}

export class UpdateApprovalChainHandler {
  constructor(
    private readonly approvalChainRepository: ApprovalChainRepository
  ) {}

  async handle(input: UpdateApprovalChainInput): Promise<ApprovalChain> {
    const chainId = ApprovalChainId.fromString(input.chainId)
    const chain = await this.approvalChainRepository.findById(chainId)

    if (!chain) {
      throw new ApprovalChainNotFoundError(input.chainId)
    }

    if (chain.getWorkspaceId().getValue() !== input.workspaceId) {
      throw new ApprovalChainNotFoundError(input.chainId)
    }

    if (input.name) {
      chain.updateName(input.name)
    }

    if (input.description !== undefined) {
      chain.updateDescription(input.description)
    }

    if (input.minAmount !== undefined || input.maxAmount !== undefined) {
      chain.updateAmountRange(input.minAmount, input.maxAmount)
    }

    if (input.approverSequence) {
      chain.updateApproverSequence(input.approverSequence)
    }

    await this.approvalChainRepository.save(chain)

    return chain
  }
}
