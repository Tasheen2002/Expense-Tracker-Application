export class ReimburseExpenseCommand {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string
  ) {}
}

export class ReimburseExpenseHandler {
  constructor(private readonly expenseService: any) {}

  async handle(command: ReimburseExpenseCommand) {
    return await this.expenseService.markExpenseAsReimbursed(
      command.expenseId,
      command.workspaceId
    )
  }
}
