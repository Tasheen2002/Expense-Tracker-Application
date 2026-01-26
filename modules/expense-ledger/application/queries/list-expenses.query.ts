export class ListExpensesQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly userId?: string
  ) {}
}

export class ListExpensesHandler {
  constructor(private readonly expenseService: any) {}

  async handle(query: ListExpensesQuery) {
    if (query.userId) {
      return await this.expenseService.getExpensesByUser(query.userId, query.workspaceId)
    }
    return await this.expenseService.getExpensesByWorkspace(query.workspaceId)
  }
}
