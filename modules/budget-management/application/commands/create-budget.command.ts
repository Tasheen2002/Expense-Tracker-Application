import { BudgetService } from '../services/budget.service'
import { Budget } from '../../domain/entities/budget.entity'
import { BudgetPeriodType } from '../../domain/enums/budget-period-type'

export interface CreateBudgetDto {
  workspaceId: string
  name: string
  description?: string
  totalAmount: number | string
  currency: string
  periodType: BudgetPeriodType
  startDate: Date
  endDate?: Date
  createdBy: string
  isRecurring?: boolean
  rolloverUnused?: boolean
}

export class CreateBudgetHandler {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(dto: CreateBudgetDto): Promise<Budget> {
    return await this.budgetService.createBudget(dto)
  }
}
