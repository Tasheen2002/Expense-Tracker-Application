export class SubmitExpenseCommand {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly userId: string
  ) {}
}

export class SubmitExpenseHandler {
  constructor(private readonly expenseService: any) {}

  async handle(command: SubmitExpenseCommand) {
    return await this.expenseService.submitExpense(
      command.expenseId,
      command.workspaceId,
      command.userId
    )
  }
}
