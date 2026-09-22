import { ApprovalChain } from '../entities/approval-chain.entity';
import { ApprovalChainId } from '../value-objects';
import { WorkspaceId, CategoryId } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface ApplicableChainParams {
  workspaceId: WorkspaceId;
  amount: number;
  categoryId?: CategoryId;
  hasReceipt: boolean;
}

export interface IApprovalChainRepository {
  save(chain: ApprovalChain): Promise<void>;
  findById(chainId: ApprovalChainId): Promise<ApprovalChain | null>;
  findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ApprovalChain>>;
  findActiveByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ApprovalChain>>;
  findApplicableChain(params: ApplicableChainParams): Promise<ApprovalChain | null>;
  delete(chain: ApprovalChain): Promise<void>;
  exists(chainId: ApprovalChainId): Promise<boolean>;
  countByWorkspaceId(workspaceId: WorkspaceId): Promise<number>;
  hasReferencingWorkflows(chainId: ApprovalChainId): Promise<boolean>;
}
