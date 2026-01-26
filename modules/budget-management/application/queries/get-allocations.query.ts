import { BudgetService } from '../services/budget.service'
import { BudgetAllocation } from '../../domain/entities/budget-allocation.entity'

export interface GetAllocationsDto {
  budgetId: string
}

export class GetAllocationsHandler {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(dto: GetAllocationsDto): Promise<BudgetAllocation[]> {
    return await this.budgetService.getAllocationsByBudget(dto.budgetId)
  }
}
