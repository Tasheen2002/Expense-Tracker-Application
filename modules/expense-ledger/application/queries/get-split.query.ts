import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { ExpenseSplitService } from '../services/expense-split.service';
import { ExpenseSplitDTO } from '../../domain/entities/expense-split.entity';

export interface GetSplitQuery extends IQuery {
  readonly splitId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class GetSplitHandler implements IQueryHandler<
  GetSplitQuery,
  QueryResult<ExpenseSplitDTO>
> {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(query: GetSplitQuery): Promise<QueryResult<ExpenseSplitDTO>> {
    const split = await this.splitService.getSplitById(
      query.splitId,
      query.workspaceId,
      query.userId
    );
    return QueryResult.success(split.toJSON());
  }
}
