import { BudgetService } from '../services/budget.service'
import { BudgetAlert } from '../../domain/entities/budget-alert.entity'

export interface GetUnreadAlertsDto {
  workspaceId: string
}

export class GetUnreadAlertsHandler {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(dto: GetUnreadAlertsDto): Promise<BudgetAlert[]> {
    return await this.budgetService.getUnreadAlerts(dto.workspaceId)
  }
}
