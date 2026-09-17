import { PolicyExemption } from '../entities/policy-exemption.entity';
import { ExemptionId, PolicyId } from '../value-objects';
import { WorkspaceId, UserId } from '@core/domain/value-objects';
import { ExemptionStatus } from '../enums/exemption-status.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface ExemptionFilters {
  status?: ExemptionStatus;
  userId?: UserId | string;
  policyId?: PolicyId | string;
  startDate?: Date;
  endDate?: Date;
}

export interface IExemptionRepository {
  save(exemption: PolicyExemption): Promise<void>;
  findById(id: ExemptionId): Promise<PolicyExemption | null>;
  findByWorkspace(
    workspaceId: WorkspaceId,
    filters?: ExemptionFilters,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PolicyExemption>>;
  findByUser(
    workspaceId: WorkspaceId,
    userId: UserId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PolicyExemption>>;
  findActiveForUser(
    workspaceId: WorkspaceId,
    userId: UserId,
    policyId: PolicyId
  ): Promise<PolicyExemption | null>;
  findActiveForUserPolicies(
    workspaceId: WorkspaceId,
    userId: UserId,
    policyIds: PolicyId[]
  ): Promise<Map<string, PolicyExemption>>;
  findPendingByWorkspace(
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PolicyExemption>>;
  expireExpiredBatch(
    workspaceId: WorkspaceId,
    now: Date,
    limit?: number
  ): Promise<number>;
  countByWorkspace(
    workspaceId: WorkspaceId,
    filters?: ExemptionFilters
  ): Promise<number>;
  delete(id: ExemptionId): Promise<void>;
}
