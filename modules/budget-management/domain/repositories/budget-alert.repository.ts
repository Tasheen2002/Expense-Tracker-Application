import { BudgetAlert } from '../entities/budget-alert.entity'
import { AlertId } from '../value-objects/alert-id'
import { BudgetId } from '../value-objects/budget-id'
import { AllocationId } from '../value-objects/allocation-id'
import { AlertLevel } from '../enums/alert-level'

export interface BudgetAlertFilters {
  budgetId?: string
  allocationId?: string
  level?: AlertLevel
  isRead?: boolean
}

export interface IBudgetAlertRepository {
  save(alert: BudgetAlert): Promise<void>
  findById(id: AlertId): Promise<BudgetAlert | null>
  findByBudget(budgetId: BudgetId): Promise<BudgetAlert[]>
  findByAllocation(allocationId: AllocationId): Promise<BudgetAlert[]>
  findByFilters(filters: BudgetAlertFilters, workspaceId: string): Promise<BudgetAlert[]>
  findUnreadAlerts(workspaceId: string): Promise<BudgetAlert[]>
  delete(id: AlertId): Promise<void>
  deleteByBudget(budgetId: BudgetId): Promise<void>
}
