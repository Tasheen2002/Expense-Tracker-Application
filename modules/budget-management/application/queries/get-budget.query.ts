import { BudgetService } from '../services/budget.service'
import { Budget } from '../../domain/entities/budget.entity'

export interface GetBudgetDto {
  budgetId: string
  workspaceId: string
}

export class GetBudgetHandler {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(dto: GetBudgetDto): Promise<Budget | null> {
    return await this.budgetService.getBudgetById(dto.budgetId, dto.workspaceId)
  }
}
