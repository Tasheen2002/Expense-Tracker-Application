import { SpendingLimit } from "../entities/spending-limit.entity";
import { SpendingLimitId } from "../value-objects/spending-limit-id";
import { BudgetPeriodType } from "../enums/budget-period-type";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface SpendingLimitFilters {
  workspaceId: string;
  userId?: string;
  categoryId?: string;
  isActive?: boolean;
  periodType?: BudgetPeriodType;
}

export interface ISpendingLimitRepository {
  save(limit: SpendingLimit): Promise<void>;
  findById(
    id: SpendingLimitId,
    workspaceId: string,
  ): Promise<SpendingLimit | null>;
  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<SpendingLimit>>;
  findByFilters(
    filters: SpendingLimitFilters,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<SpendingLimit>>;
  findActiveByUser(
    workspaceId: string,
    userId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<SpendingLimit>>;
  findActiveByCategory(
    workspaceId: string,
    categoryId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<SpendingLimit>>;
  findApplicableLimits(
    workspaceId: string,
    userId?: string,
    categoryId?: string,
  ): Promise<SpendingLimit[]>;
  delete(id: SpendingLimitId, workspaceId: string): Promise<void>;
}
