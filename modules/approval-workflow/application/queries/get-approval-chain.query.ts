import { ApprovalChainRepository } from '../../domain/repositories/approval-chain.repository'
import { ApprovalChain } from '../../domain/entities/approval-chain.entity'
import { ApprovalChainId } from '../../domain/value-objects/approval-chain-id'
import { ApprovalChainNotFoundError } from '../../domain/errors/approval-workflow.errors'

export interface GetApprovalChainInput {
  chainId: string
  workspaceId: string
}

export class GetApprovalChainHandler {
  constructor(
    private readonly approvalChainRepository: ApprovalChainRepository
  ) {}

  async handle(input: GetApprovalChainInput): Promise<ApprovalChain> {
    const chainId = ApprovalChainId.fromString(input.chainId)
    const chain = await this.approvalChainRepository.findById(chainId)

    if (!chain || chain.getWorkspaceId().getValue() !== input.workspaceId) {
      throw new ApprovalChainNotFoundError(input.chainId)
    }

    return chain
  }
}
