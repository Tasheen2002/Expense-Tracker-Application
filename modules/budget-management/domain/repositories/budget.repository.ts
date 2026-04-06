import { Budget } from '../entities/budget.entity';
import { BudgetId } from '../value-objects/budget-id';
import { BudgetStatus } from '../enums/budget-status';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface BudgetFilters {
  workspaceId: string;
  status?: BudgetStatus;
  isActive?: boolean;
  createdBy?: string;
  currency?: string;
}

export interface IBudgetRepository {
  save(budget: Budget): Promise<void>;
  findById(id: BudgetId, workspaceId: string): Promise<Budget | null>;
  /**
   * Internal-only lookup by ID without workspace scoping.
   * MUST NOT be exposed via HTTP endpoints — for trusted internal service
   * operations (e.g. marking a budget exceeded when processing allocation spending).
   */
  findByIdInternal(id: BudgetId): Promise<Budget | null>;
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
