import { Budget } from "../entities/budget.entity";
import { BudgetId } from "../value-objects/budget-id";
import { BudgetStatus } from "../enums/budget-status";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PaginationOptions } from "../../../../apps/api/src/shared/domain/interfaces/pagination-options.interface";

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
  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Budget>>;
  findByFilters(
    filters: BudgetFilters,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Budget>>;
  findActiveBudgets(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Budget>>;
  findExpiredBudgets(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Budget>>;
  delete(id: BudgetId, workspaceId: string): Promise<void>;
  exists(id: BudgetId, workspaceId: string): Promise<boolean>;
  existsByName(name: string, workspaceId: string): Promise<boolean>;
}
