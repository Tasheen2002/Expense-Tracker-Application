import { SpendingLimit } from '../entities/spending-limit.entity'
import { SpendingLimitId } from '../value-objects/spending-limit-id'
import { BudgetPeriodType } from '../enums/budget-period-type'

export interface SpendingLimitFilters {
  workspaceId: string
  userId?: string
  categoryId?: string
  isActive?: boolean
  periodType?: BudgetPeriodType
}

export interface ISpendingLimitRepository {
  save(limit: SpendingLimit): Promise<void>
  findById(id: SpendingLimitId, workspaceId: string): Promise<SpendingLimit | null>
  findByWorkspace(workspaceId: string): Promise<SpendingLimit[]>
  findByFilters(filters: SpendingLimitFilters): Promise<SpendingLimit[]>
  findActiveByUser(workspaceId: string, userId: string): Promise<SpendingLimit[]>
  findActiveByCategory(workspaceId: string, categoryId: string): Promise<SpendingLimit[]>
  findApplicableLimits(workspaceId: string, userId?: string, categoryId?: string): Promise<SpendingLimit[]>
  delete(id: SpendingLimitId, workspaceId: string): Promise<void>
}
