import { ApprovalChainRepository } from '../../domain/repositories/approval-chain.repository'
import { ApprovalChain } from '../../domain/entities/approval-chain.entity'

export interface ListApprovalChainsInput {
  workspaceId: string
  activeOnly?: boolean
}

export class ListApprovalChainsHandler {
  constructor(
    private readonly approvalChainRepository: ApprovalChainRepository
  ) {}

  async handle(input: ListApprovalChainsInput): Promise<ApprovalChain[]> {
    if (input.activeOnly) {
      return await this.approvalChainRepository.findActiveByWorkspace(input.workspaceId)
    }

    return await this.approvalChainRepository.findByWorkspace(input.workspaceId)
  }
}
