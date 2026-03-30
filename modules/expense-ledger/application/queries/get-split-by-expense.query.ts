import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';
import { ExpenseSplitService } from '../services/expense-split.service';
import { ExpenseSplit } from '../../domain/entities/expense-split.entity';
import { SplitNotFoundError } from '../../domain/errors/split-expense.errors';

export interface GetSplitByExpenseQuery extends IQuery {
  expenseId: string;
  workspaceId: string;
  userId: string;
}

export class GetSplitByExpenseHandler implements IQueryHandler<
  GetSplitByExpenseQuery,
  QueryResult<ExpenseSplit>
> {
  constructor(private readonly expenseSplitService: ExpenseSplitService) {}

  async handle(
    query: GetSplitByExpenseQuery
  ): Promise<QueryResult<ExpenseSplit>> {
    try {
      const split = await this.expenseSplitService.getSplitByExpenseId(
        query.expenseId,
        query.workspaceId,
        query.userId
      );
      if (!split) {
        throw new SplitNotFoundError(query.expenseId);
      }
      return QueryResult.success(split);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
