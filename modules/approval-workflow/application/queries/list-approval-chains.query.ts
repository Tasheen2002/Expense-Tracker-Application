import { ApprovalChainRepository } from '../../domain/repositories/approval-chain.repository'
import { ApprovalChain } from '../../domain/entities/approval-chain.entity'
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface'

export interface ListApprovalChainsInput {
  workspaceId: string
  activeOnly?: boolean
  limit?: number
  offset?: number
}

export class ListApprovalChainsHandler {
  constructor(
    private readonly approvalChainRepository: ApprovalChainRepository
  ) {}

  async handle(input: ListApprovalChainsInput): Promise<PaginatedResult<ApprovalChain>> {
    const options = {
      limit: input.limit,
      offset: input.offset,
    }

    if (input.activeOnly) {
      return await this.approvalChainRepository.findActiveByWorkspace(input.workspaceId, options)
    }

    return await this.approvalChainRepository.findByWorkspace(input.workspaceId, options)
  }
}
