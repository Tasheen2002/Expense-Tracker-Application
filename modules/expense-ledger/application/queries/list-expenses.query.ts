import { ExpenseService } from "../services/expense.service";

export class ListExpensesQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly userId?: string,
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}

export class ListExpensesHandler {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(query: ListExpensesQuery) {
    return await this.expenseService.getExpensesWithFilters({
      workspaceId: query.workspaceId,
      userId: query.userId,
      pagination: {
        limit: query.limit,
        offset: query.offset,
      },
    });
  }
}
