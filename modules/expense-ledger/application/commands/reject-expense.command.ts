export class RejectExpenseCommand {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string
  ) {}
}

export class RejectExpenseHandler {
  constructor(private readonly expenseService: any) {}

  async handle(command: RejectExpenseCommand) {
    return await this.expenseService.rejectExpense(command.expenseId, command.workspaceId)
  }
}
