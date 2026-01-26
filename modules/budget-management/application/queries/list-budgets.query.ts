import { BudgetService } from '../services/budget.service'
import { Budget } from '../../domain/entities/budget.entity'
import { BudgetStatus } from '../../domain/enums/budget-status'

export interface ListBudgetsDto {
  workspaceId: string
  status?: BudgetStatus
  isActive?: boolean
  createdBy?: string
  currency?: string
}

export class ListBudgetsHandler {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(dto: ListBudgetsDto): Promise<Budget[]> {
    if (dto.status || dto.isActive !== undefined || dto.createdBy || dto.currency) {
      return await this.budgetService.filterBudgets({
        workspaceId: dto.workspaceId,
        status: dto.status,
        isActive: dto.isActive,
        createdBy: dto.createdBy,
        currency: dto.currency,
      })
    }

    return await this.budgetService.getBudgetsByWorkspace(dto.workspaceId)
  }
}
