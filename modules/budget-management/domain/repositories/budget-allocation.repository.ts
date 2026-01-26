import { BudgetAllocation } from '../entities/budget-allocation.entity'
import { AllocationId } from '../value-objects/allocation-id'
import { BudgetId } from '../value-objects/budget-id'

export interface IBudgetAllocationRepository {
  save(allocation: BudgetAllocation): Promise<void>
  findById(id: AllocationId): Promise<BudgetAllocation | null>
  findByBudget(budgetId: BudgetId): Promise<BudgetAllocation[]>
  findByBudgetAndCategory(budgetId: BudgetId, categoryId: string): Promise<BudgetAllocation | null>
  delete(id: AllocationId): Promise<void>
  deleteByBudget(budgetId: BudgetId): Promise<void>
}
