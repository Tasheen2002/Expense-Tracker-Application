import { BudgetService } from '../services/budget.service'

export interface DeleteBudgetDto {
  budgetId: string
  workspaceId: string
}

export class DeleteBudgetHandler {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(dto: DeleteBudgetDto): Promise<void> {
    await this.budgetService.deleteBudget(dto.budgetId, dto.workspaceId)
  }
}
