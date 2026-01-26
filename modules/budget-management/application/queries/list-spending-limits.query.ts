import { SpendingLimitService } from '../services/spending-limit.service'
import { SpendingLimit } from '../../domain/entities/spending-limit.entity'
import { BudgetPeriodType } from '../../domain/enums/budget-period-type'

export interface ListSpendingLimitsDto {
  workspaceId: string
  userId?: string
  categoryId?: string
  isActive?: boolean
  periodType?: BudgetPeriodType
}

export class ListSpendingLimitsHandler {
  constructor(private readonly limitService: SpendingLimitService) {}

  async handle(dto: ListSpendingLimitsDto): Promise<SpendingLimit[]> {
    if (
      dto.userId !== undefined ||
      dto.categoryId !== undefined ||
      dto.isActive !== undefined ||
      dto.periodType
    ) {
      return await this.limitService.filterSpendingLimits({
        workspaceId: dto.workspaceId,
        userId: dto.userId,
        categoryId: dto.categoryId,
        isActive: dto.isActive,
        periodType: dto.periodType,
      })
    }

    return await this.limitService.getSpendingLimitsByWorkspace(dto.workspaceId)
  }
}
