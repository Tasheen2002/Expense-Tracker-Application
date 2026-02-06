import { BudgetService } from '../services/budget.service'
import { BudgetAllocation } from '../../domain/entities/budget-allocation.entity'
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface'

export interface GetAllocationsDto {
  budgetId: string
  limit?: number
  offset?: number
}

export class GetAllocationsHandler {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(dto: GetAllocationsDto): Promise<PaginatedResult<BudgetAllocation>> {
    const options = {
      limit: dto.limit,
      offset: dto.offset,
    }

    return await this.budgetService.getAllocationsByBudget(dto.budgetId, options)
  }
}
