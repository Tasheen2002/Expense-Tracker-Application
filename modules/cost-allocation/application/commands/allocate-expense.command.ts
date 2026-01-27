import { ExpenseAllocationService } from '../services/expense-allocation.service'

export class AllocateExpenseCommand {
  constructor(
    public readonly workspaceId: string,
    public readonly expenseId: string,
    public readonly createdBy: string,
    public readonly allocations: Array<{
      amount: number
      percentage?: number
      departmentId?: string
      costCenterId?: string
      projectId?: string
      notes?: string
    }>
  ) {}
}

export class AllocateExpenseHandler {
  constructor(
    private readonly expenseAllocationService: ExpenseAllocationService
  ) {}

  async handle(command: AllocateExpenseCommand): Promise<void> {
    await this.expenseAllocationService.allocateExpense({
      workspaceId: command.workspaceId,
      expenseId: command.expenseId,
      createdBy: command.createdBy,
      allocations: command.allocations,
    })
  }
}
