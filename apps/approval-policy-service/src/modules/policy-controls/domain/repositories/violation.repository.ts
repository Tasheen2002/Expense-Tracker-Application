import { PolicyViolation } from '../entities/policy-violation.entity';
import { ViolationId, PolicyId } from '../value-objects';
import { WorkspaceId, ExpenseId, UserId } from '@core/domain/value-objects';
import { ViolationStatus } from '../enums/violation-status.enum';
import { ViolationSeverity } from '../enums/violation-severity.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface ViolationFilters {
  status?: ViolationStatus;
  severity?: ViolationSeverity;
  userId?: UserId | string;
  expenseId?: ExpenseId | string;
  policyId?: PolicyId | string;
  startDate?: Date;
  endDate?: Date;
}

export interface ViolationStats {
  total: number;
  byStatus: Record<ViolationStatus, number>;
  bySeverity: Record<ViolationSeverity, number>;
}

export interface IViolationRepository {
  save(violation: PolicyViolation): Promise<void>;
  saveAll(violations: PolicyViolation[]): Promise<void>;
  saveForExpense(
    workspaceId: WorkspaceId,
    expenseId: ExpenseId,
    violations: PolicyViolation[]
  ): Promise<void>;
  findById(id: ViolationId): Promise<PolicyViolation | null>;
  findByWorkspace(
    workspaceId: WorkspaceId,
    filters?: ViolationFilters,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyViolation>>;
  findByExpense(
    workspaceId: WorkspaceId,
    expenseId: ExpenseId,
  ): Promise<PolicyViolation[]>;
  findByUser(
    workspaceId: WorkspaceId,
    userId: UserId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyViolation>>;
  findPendingByWorkspace(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyViolation>>;
  countByWorkspace(
    workspaceId: WorkspaceId,
    filters?: ViolationFilters,
  ): Promise<number>;
  getStats(
    workspaceId: WorkspaceId,
    filters?: { startDate?: Date; endDate?: Date },
  ): Promise<ViolationStats>;
  delete(id: ViolationId): Promise<void>;
  deleteByExpense(
    workspaceId: WorkspaceId,
    expenseId: ExpenseId,
  ): Promise<void>;
}
