import { BudgetService } from '../services/budget.service'
import { BudgetAlert } from '../../domain/entities/budget-alert.entity'
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface'

export interface GetUnreadAlertsDto {
  workspaceId: string
  limit?: number
  offset?: number
}

export class GetUnreadAlertsHandler {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(dto: GetUnreadAlertsDto): Promise<PaginatedResult<BudgetAlert>> {
    const options = {
      limit: dto.limit,
      offset: dto.offset,
    }

    return await this.budgetService.getUnreadAlerts(dto.workspaceId, options)
  }
}
