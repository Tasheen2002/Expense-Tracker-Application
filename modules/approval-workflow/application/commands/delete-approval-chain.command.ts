import { ApprovalChainRepository } from '../../domain/repositories/approval-chain.repository'
import { ApprovalChainId } from '../../domain/value-objects/approval-chain-id'
import { ApprovalChainNotFoundError } from '../../domain/errors/approval-workflow.errors'

export interface DeleteApprovalChainInput {
  chainId: string
  workspaceId: string
}

export class DeleteApprovalChainHandler {
  constructor(
    private readonly approvalChainRepository: ApprovalChainRepository
  ) {}

  async handle(input: DeleteApprovalChainInput): Promise<void> {
    const chainId = ApprovalChainId.fromString(input.chainId)
    const chain = await this.approvalChainRepository.findById(chainId)

    if (!chain) {
      throw new ApprovalChainNotFoundError(input.chainId)
    }

    if (chain.getWorkspaceId().getValue() !== input.workspaceId) {
      throw new ApprovalChainNotFoundError(input.chainId)
    }

    await this.approvalChainRepository.delete(chainId)
  }
}
