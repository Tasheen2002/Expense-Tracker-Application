import { BudgetAllocation } from '../entities/budget-allocation.entity';
import { AllocationId } from '../value-objects/allocation-id';
import { BudgetId } from '../value-objects/budget-id';
import { BudgetAlert } from '../entities/budget-alert.entity';
import Decimal from 'decimal.js';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface IBudgetAllocationRepository {
  save(allocation: BudgetAllocation): Promise<void>;
  saveWithAlerts(
    allocation: BudgetAllocation,
    alerts: BudgetAlert[]
  ): Promise<void>;
  /**
   * Atomically validates that the new allocation amount doesn't exceed the budget
   * total within the same transaction, then saves the allocation.
   * Prevents TOCTOU race conditions in concurrent allocation requests.
   */
  saveWithBudgetValidation(
    allocation: BudgetAllocation,
    excludeAllocationId?: string
  ): Promise<void>;
  findById(id: AllocationId): Promise<BudgetAllocation | null>;
  findByIdInWorkspace(
    id: AllocationId,
    workspaceId: string
  ): Promise<BudgetAllocation | null>;
  findByBudget(
    budgetId: BudgetId,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<BudgetAllocation>>;
  findByBudgetAndCategory(
    budgetId: BudgetId,
    workspaceId: string,
    categoryId: string
  ): Promise<BudgetAllocation | null>;
  getTotalAllocatedAmount(budgetId: BudgetId): Promise<Decimal>;
  getTotalSpentAmount(budgetId: BudgetId): Promise<Decimal>;
  delete(id: AllocationId, workspaceId: string): Promise<void>;
}
