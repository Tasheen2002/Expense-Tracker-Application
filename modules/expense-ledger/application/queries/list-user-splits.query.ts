import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { ExpenseSplitService } from '../services/expense-split.service';
import { ExpenseSplit } from '../../domain/entities/expense-split.entity';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';

export interface ListUserSplitsQuery extends IQuery {
  readonly userId: string;
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListUserSplitsHandler implements IQueryHandler<
  ListUserSplitsQuery,
  QueryResult<PaginatedResult<ExpenseSplit>>
> {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(
    query: ListUserSplitsQuery
  ): Promise<QueryResult<PaginatedResult<ExpenseSplit>>> {
    const result = await this.splitService.listUserSplits(
      query.userId,
      query.workspaceId,
      { limit: query.limit, offset: query.offset }
    );
    return QueryResult.success(result);
  }
}
