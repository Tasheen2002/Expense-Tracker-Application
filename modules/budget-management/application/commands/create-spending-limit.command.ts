import { SpendingLimitService } from '../services/spending-limit.service'
import { SpendingLimit } from '../../domain/entities/spending-limit.entity'
import { BudgetPeriodType } from '../../domain/enums/budget-period-type'

export interface CreateSpendingLimitDto {
  workspaceId: string
  userId?: string
  categoryId?: string
  limitAmount: number | string
  currency: string
  periodType: BudgetPeriodType
}

export class CreateSpendingLimitHandler {
  constructor(private readonly limitService: SpendingLimitService) {}

  async handle(dto: CreateSpendingLimitDto): Promise<SpendingLimit> {
    return await this.limitService.createSpendingLimit(dto)
  }
}
