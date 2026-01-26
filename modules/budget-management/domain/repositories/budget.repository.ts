import { Budget } from '../entities/budget.entity'
import { BudgetId } from '../value-objects/budget-id'
import { BudgetStatus } from '../enums/budget-status'

export interface BudgetFilters {
  workspaceId: string
  status?: BudgetStatus
  isActive?: boolean
  createdBy?: string
  currency?: string
}

export interface IBudgetRepository {
  save(budget: Budget): Promise<void>
  findById(id: BudgetId, workspaceId: string): Promise<Budget | null>
  findByWorkspace(workspaceId: string): Promise<Budget[]>
  findByFilters(filters: BudgetFilters): Promise<Budget[]>
  findActiveBudgets(workspaceId: string): Promise<Budget[]>
  findExpiredBudgets(workspaceId: string): Promise<Budget[]>
  delete(id: BudgetId, workspaceId: string): Promise<void>
  exists(id: BudgetId, workspaceId: string): Promise<boolean>
}
