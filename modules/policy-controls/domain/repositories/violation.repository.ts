import { PolicyViolation } from "../entities/policy-violation.entity";
import { ViolationId } from "../value-objects/violation-id";
import { ViolationStatus } from "../enums/violation-status.enum";
import { ViolationSeverity } from "../enums/violation-severity.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface ViolationFilters {
  status?: ViolationStatus;
  severity?: ViolationSeverity;
  userId?: string;
  expenseId?: string;
  policyId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ViolationRepository {
  save(violation: PolicyViolation): Promise<void>;
  findById(id: ViolationId): Promise<PolicyViolation | null>;
  findByWorkspace(
    workspaceId: string,
    filters?: ViolationFilters,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyViolation>>;
  findByExpense(expenseId: string): Promise<PolicyViolation[]>;
  findByUser(
    workspaceId: string,
    userId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyViolation>>;
  findPendingByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<PolicyViolation>>;
  countByWorkspace(
    workspaceId: string,
    filters?: ViolationFilters,
  ): Promise<number>;
  delete(id: ViolationId): Promise<void>;
  deleteByExpense(expenseId: string): Promise<void>;
}
