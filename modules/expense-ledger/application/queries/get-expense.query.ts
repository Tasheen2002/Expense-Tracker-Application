import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';
import { ExpenseService } from '../services/expense.service';
import { Expense } from '../../domain/entities/expense.entity';
import { ExpenseNotFoundError } from '../../domain/errors/expense.errors';

export interface GetExpenseQuery extends IQuery {
  readonly expenseId: string;
  readonly workspaceId: string;
}

export class GetExpenseHandler implements IQueryHandler<
  GetExpenseQuery,
  QueryResult<Expense>
> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(query: GetExpenseQuery): Promise<QueryResult<Expense>> {
    const expense = await this.expenseService.getExpenseById(
      query.expenseId,
      query.workspaceId
    );

    if (!expense) {
      throw new ExpenseNotFoundError(query.expenseId, query.workspaceId);
    }

    return QueryResult.success(expense);
  }
}
