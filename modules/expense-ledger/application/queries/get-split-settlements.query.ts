import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';
import { ExpenseSplitService } from '../services/expense-split.service';
import { SplitSettlement } from '../../domain/entities/split-settlement.entity';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';

export interface GetSplitSettlementsQuery extends IQuery {
  splitId: string;
  workspaceId: string;
  userId: string;
}

export class GetSplitSettlementsHandler implements IQueryHandler<
  GetSplitSettlementsQuery,
  QueryResult<PaginatedResult<SplitSettlement>>
> {
  constructor(private readonly expenseSplitService: ExpenseSplitService) {}

  async handle(
    query: GetSplitSettlementsQuery
  ): Promise<QueryResult<PaginatedResult<SplitSettlement>>> {
    try {
      const settlements = await this.expenseSplitService.getSplitSettlements(
        query.splitId,
        query.workspaceId,
        query.userId
      );
      return QueryResult.success(settlements);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
