import { BudgetService } from '../services/budget.service'
import { Budget } from '../../domain/entities/budget.entity'

export interface ArchiveBudgetDto {
  budgetId: string
  workspaceId: string
}

export class ArchiveBudgetHandler {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(dto: ArchiveBudgetDto): Promise<Budget> {
    return await this.budgetService.archiveBudget(dto.budgetId, dto.workspaceId)
  }
}
