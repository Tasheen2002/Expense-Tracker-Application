export class ApproveExpenseCommand {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string
  ) {}
}

export class ApproveExpenseHandler {
  constructor(private readonly expenseService: any) {}

  async handle(command: ApproveExpenseCommand) {
    return await this.expenseService.approveExpense(command.expenseId, command.workspaceId)
  }
}
