import { ExpensePolicy } from '../entities/expense-policy.entity';
import { PolicyId } from '../value-objects';
import { PolicyType } from '../enums/policy-type.enum';
import { WorkspaceId } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface IPolicyRepository {
  save(policy: ExpensePolicy): Promise<void>;
  findById(id: PolicyId): Promise<ExpensePolicy | null>;
  findByWorkspace(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
    filters?: { activeOnly?: boolean; policyType?: PolicyType }
  ): Promise<PaginatedResult<ExpensePolicy>>;
  findActiveByWorkspace(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpensePolicy>>;
  findAllActiveByWorkspace(
    workspaceId: WorkspaceId,
  ): Promise<ExpensePolicy[]>;
  findByType(
    workspaceId: WorkspaceId,
    type: PolicyType,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpensePolicy>>;
  findByNameInWorkspace(
    workspaceId: WorkspaceId,
    name: string,
  ): Promise<ExpensePolicy | null>;
  delete(id: PolicyId): Promise<void>;
  hasActiveReferences(policyId: PolicyId): Promise<boolean>;
}
