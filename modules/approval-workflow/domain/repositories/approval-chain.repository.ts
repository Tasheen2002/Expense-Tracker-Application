import { ApprovalChain } from '../entities/approval-chain.entity'
import { ApprovalChainId } from '../value-objects/approval-chain-id'
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface'

export interface ApprovalChainRepository {
  save(chain: ApprovalChain): Promise<void>
  findById(chainId: ApprovalChainId): Promise<ApprovalChain | null>
  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ApprovalChain>>
  findActiveByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ApprovalChain>>
  findApplicableChain(params: {
    workspaceId: string
    amount: number
    categoryId?: string
    hasReceipt: boolean
  }): Promise<ApprovalChain | null>
  delete(chainId: ApprovalChainId): Promise<void>
}
