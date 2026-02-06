import { BudgetAlert } from "../entities/budget-alert.entity";
import { AlertId } from "../value-objects/alert-id";
import { BudgetId } from "../value-objects/budget-id";
import { AllocationId } from "../value-objects/allocation-id";
import { AlertLevel } from "../enums/alert-level";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface BudgetAlertFilters {
  budgetId?: string;
  allocationId?: string;
  level?: AlertLevel;
  isRead?: boolean;
}

export interface IBudgetAlertRepository {
  save(alert: BudgetAlert): Promise<void>;
  findById(id: AlertId): Promise<BudgetAlert | null>;
  findByBudget(
    budgetId: BudgetId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BudgetAlert>>;
  findByAllocation(
    allocationId: AllocationId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BudgetAlert>>;
  findByFilters(
    filters: BudgetAlertFilters,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BudgetAlert>>;
  findUnreadAlerts(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BudgetAlert>>;
  delete(id: AlertId): Promise<void>;
  deleteByBudget(budgetId: BudgetId): Promise<void>;
}
