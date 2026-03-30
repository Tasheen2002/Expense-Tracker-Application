import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';
import { ExpenseSplitService } from '../services/expense-split.service';
import { ExpenseSplit } from '../../domain/entities/expense-split.entity';

export interface GetSplitQuery extends IQuery {
  readonly splitId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class GetSplitHandler implements IQueryHandler<
  GetSplitQuery,
  QueryResult<ExpenseSplit>
> {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(query: GetSplitQuery): Promise<QueryResult<ExpenseSplit>> {
    const split = await this.splitService.getSplitById(
      query.splitId,
      query.workspaceId,
      query.userId
    );
    return QueryResult.success(split);
  }
}
