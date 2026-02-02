import { ExpenseNotFoundError } from "../../domain/errors/expense.errors";

export class GetExpenseQuery {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
  ) {}
}

export class GetExpenseHandler {
  constructor(private readonly expenseService: any) {}

  async handle(query: GetExpenseQuery) {
    const expense = await this.expenseService.getExpenseById(
      query.expenseId,
      query.workspaceId,
    );

    if (!expense) {
      throw new ExpenseNotFoundError(query.expenseId, query.workspaceId);
    }

    return expense;
  }
}
