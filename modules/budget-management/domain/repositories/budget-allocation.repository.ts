import { BudgetAllocation } from "../entities/budget-allocation.entity";
import { AllocationId } from "../value-objects/allocation-id";
import { BudgetId } from "../value-objects/budget-id";
import { BudgetAlert } from "../entities/budget-alert.entity";
import { Decimal } from "@prisma/client/runtime/library";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface IBudgetAllocationRepository {
  save(allocation: BudgetAllocation): Promise<void>;
  saveWithAlerts(
    allocation: BudgetAllocation,
    alerts: BudgetAlert[],
  ): Promise<void>;
  /**
   * Atomically validates that the new allocation amount doesn't exceed the budget
   * total, then saves the allocation within a serializable transaction.
   * Prevents TOCTOU race conditions in concurrent allocation requests.
   */
  saveWithBudgetValidation(
    allocation: BudgetAllocation,
    budgetTotalAmount: Decimal,
    excludeAllocationId?: string,
  ): Promise<void>;
  findById(id: AllocationId): Promise<BudgetAllocation | null>;
  findByBudget(
    budgetId: BudgetId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BudgetAllocation>>;
  findByBudgetAndCategory(
    budgetId: BudgetId,
    categoryId: string,
  ): Promise<BudgetAllocation | null>;
  getTotalAllocatedAmount(budgetId: BudgetId): Promise<Decimal>;
  delete(id: AllocationId): Promise<void>;
  deleteByBudget(budgetId: BudgetId): Promise<void>;
}
