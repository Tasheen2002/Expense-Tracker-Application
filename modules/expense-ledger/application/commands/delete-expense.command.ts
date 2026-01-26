export class DeleteExpenseCommand {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly userId: string
  ) {}
}

export class DeleteExpenseHandler {
  constructor(private readonly expenseService: any) {}

  async handle(command: DeleteExpenseCommand): Promise<void> {
    await this.expenseService.deleteExpense(
      command.expenseId,
      command.workspaceId,
      command.userId
    )
  }
}
