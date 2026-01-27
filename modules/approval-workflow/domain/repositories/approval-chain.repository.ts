import { ApprovalChain } from '../entities/approval-chain.entity'
import { ApprovalChainId } from '../value-objects/approval-chain-id'

export interface ApprovalChainRepository {
  save(chain: ApprovalChain): Promise<void>
  findById(chainId: ApprovalChainId): Promise<ApprovalChain | null>
  findByWorkspace(workspaceId: string): Promise<ApprovalChain[]>
  findActiveByWorkspace(workspaceId: string): Promise<ApprovalChain[]>
  findApplicableChain(params: {
    workspaceId: string
    amount: number
    categoryId?: string
    hasReceipt: boolean
  }): Promise<ApprovalChain | null>
  delete(chainId: ApprovalChainId): Promise<void>
}
