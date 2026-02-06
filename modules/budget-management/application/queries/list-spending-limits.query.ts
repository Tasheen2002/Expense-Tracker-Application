import { SpendingLimitService } from '../services/spending-limit.service'
import { SpendingLimit } from '../../domain/entities/spending-limit.entity'
import { BudgetPeriodType } from '../../domain/enums/budget-period-type'
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface'

export interface ListSpendingLimitsDto {
  workspaceId: string
  userId?: string
  categoryId?: string
  isActive?: boolean
  periodType?: BudgetPeriodType
  limit?: number
  offset?: number
}

export class ListSpendingLimitsHandler {
  constructor(private readonly limitService: SpendingLimitService) {}

  async handle(dto: ListSpendingLimitsDto): Promise<PaginatedResult<SpendingLimit>> {
    const options = {
      limit: dto.limit,
      offset: dto.offset,
    }

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
      }, options)
    }

    return await this.limitService.getSpendingLimitsByWorkspace(dto.workspaceId, options)
  }
}
