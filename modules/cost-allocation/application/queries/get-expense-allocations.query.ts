import { ExpenseAllocationService } from '../services/expense-allocation.service'
import { ExpenseAllocation } from '../../domain/entities/expense-allocation.entity'

export class GetExpenseAllocationsQuery {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string
  ) {}
}

export class GetExpenseAllocationsHandler {
  constructor(
    private readonly expenseAllocationService: ExpenseAllocationService
  ) {}

  async handle(query: GetExpenseAllocationsQuery): Promise<ExpenseAllocation[]> {
    return await this.expenseAllocationService.getAllocations(
      query.expenseId,
      query.workspaceId
    )
  }
}
