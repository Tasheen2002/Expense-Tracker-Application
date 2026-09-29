import { Budget } from '../entities/budget.entity';
import { BudgetId } from '../value-objects/budget-id';
import { BudgetStatus } from '../enums/budget-status';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface BudgetFilters {
  workspaceId: string;
  status?: BudgetStatus;
  isActive?: boolean;
  createdBy?: string;
  currency?: string;
}

export interface IBudgetRepository {
  create(budget: Budget): Promise<void>;
  save(budget: Budget): Promise<void>;
  /**
   * Saves budget updates (e.g. totalAmount reduction) with atomic validation against
   * current allocated amounts under an exclusive row lock.
   */
  saveWithAllocationValidation(budget: Budget): Promise<void>;
  findById(id: BudgetId, workspaceId: string): Promise<Budget | null>;
  /**
   * Internal-only lookup by ID with exclusive coordination of concurrent writes.
   * MUST NOT be exposed via HTTP endpoints — for coordinating concurrent modifications
   * across child aggregates (e.g. updating allocation spending and parent budget status).
   */
  findByIdInternalWithLock(id: BudgetId): Promise<Budget | null>;
  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Budget>>;
  findByFilters(
    filters: BudgetFilters,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Budget>>;
  findActiveBudgets(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Budget>>;
  findExpiredBudgets(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Budget>>;
  delete(id: BudgetId, workspaceId: string): Promise<void>;
  exists(id: BudgetId, workspaceId: string): Promise<boolean>;
  existsByName(name: string, workspaceId: string): Promise<boolean>;
}
