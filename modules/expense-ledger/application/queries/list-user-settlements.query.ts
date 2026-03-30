import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';
import { ExpenseSplitService } from '../services/expense-split.service';
import { SplitSettlement } from '../../domain/entities/split-settlement.entity';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import { SettlementStatus } from '../../domain/enums/settlement-status';

export interface ListUserSettlementsQuery extends IQuery {
  readonly userId: string;
  readonly workspaceId: string;
  readonly status?: SettlementStatus;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListUserSettlementsHandler implements IQueryHandler<
  ListUserSettlementsQuery,
  QueryResult<PaginatedResult<SplitSettlement>>
> {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(
    query: ListUserSettlementsQuery
  ): Promise<QueryResult<PaginatedResult<SplitSettlement>>> {
    const result = await this.splitService.getUserSettlements(
      query.userId,
      query.workspaceId,
      query.status,
      { limit: query.limit, offset: query.offset }
    );
    return QueryResult.success(result);
  }
}
