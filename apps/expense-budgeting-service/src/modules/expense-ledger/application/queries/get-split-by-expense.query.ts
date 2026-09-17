import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { ExpenseSplitService } from '../services/expense-split.service';
import { ExpenseSplitDTO } from '../../domain/entities/expense-split.entity';
import { SplitNotFoundError } from '../../domain/errors/split-expense.errors';

export interface GetSplitByExpenseQuery extends IQuery {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class GetSplitByExpenseHandler implements IQueryHandler<GetSplitByExpenseQuery, ExpenseSplitDTO> {
  constructor(private readonly expenseSplitService: ExpenseSplitService) {}

  async handle(query: GetSplitByExpenseQuery): Promise<ExpenseSplitDTO> {
    const split = await this.expenseSplitService.getSplitByExpenseId(
      query.expenseId,
      query.workspaceId,
      query.userId
    );
    if (!split) {
      throw new SplitNotFoundError(query.expenseId);
    }
    return split;
  }
}
