import { BudgetAlert } from '../entities/budget-alert.entity';
import { AlertId } from '../value-objects/alert-id';
import { BudgetId } from '../value-objects/budget-id';
import { AllocationId } from '../value-objects/allocation-id';
import { AlertLevel } from '../enums/alert-level';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface BudgetAlertFilters {
  budgetId?: string;
  allocationId?: string;
  level?: AlertLevel;
  isRead?: boolean;
}

export interface IBudgetAlertRepository {
  save(alert: BudgetAlert, workspaceId: string): Promise<void>;
  findById(id: AlertId, workspaceId: string): Promise<BudgetAlert | null>;
  findByBudget(
    budgetId: BudgetId,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetAlert>>;
  findByAllocation(
    allocationId: AllocationId,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetAlert>>;
  findByFilters(
    filters: BudgetAlertFilters,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetAlert>>;
  findUnreadAlerts(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetAlert>>;
  delete(id: AlertId, workspaceId: string): Promise<void>;
  deleteByBudget(budgetId: BudgetId, workspaceId: string): Promise<void>;
}
