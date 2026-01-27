import { ExpenseAllocationService } from '../services/expense-allocation.service'

export class DeleteAllocationsCommand {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string
  ) {}
}

export class DeleteAllocationsHandler {
  constructor(
    private readonly expenseAllocationService: ExpenseAllocationService
  ) {}

  async handle(command: DeleteAllocationsCommand): Promise<void> {
    await this.expenseAllocationService.deleteAllocations(
      command.expenseId,
      command.workspaceId
    )
  }
}
