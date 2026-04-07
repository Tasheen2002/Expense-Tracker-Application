import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { ExpenseSplitService } from '../services/expense-split.service';
import { ExpenseSplitDTO } from '../../domain/entities/expense-split.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ListUserSplitsQuery extends IQuery {
  readonly userId: string;
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListUserSplitsHandler implements IQueryHandler<
  ListUserSplitsQuery,
  QueryResult<PaginatedResult<ExpenseSplitDTO>>
> {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(
    query: ListUserSplitsQuery
  ): Promise<QueryResult<PaginatedResult<ExpenseSplitDTO>>> {
    const result = await this.splitService.listUserSplits(
      query.userId,
      query.workspaceId,
      { limit: query.limit, offset: query.offset }
    );
    return QueryResult.success({
      ...result,
      items: result.items.map((split) => split.toJSON()),
    });
  }
}
