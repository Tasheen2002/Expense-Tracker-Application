import { ExpenseNotFoundError } from "../../domain/errors/expense.errors";

import { ExpenseService } from "../services/expense.service";

export class GetExpenseQuery {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
  ) {}
}

export class GetExpenseHandler {
  constructor(private readonly expenseService: ExpenseService) {}

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
