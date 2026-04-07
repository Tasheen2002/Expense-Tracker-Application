import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { ExpenseSplitService } from '../services/expense-split.service';
import { SplitSettlementDTO } from '../../domain/entities/split-settlement.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface GetSplitSettlementsQuery extends IQuery {
  splitId: string;
  workspaceId: string;
  userId: string;
}

export class GetSplitSettlementsHandler implements IQueryHandler<
  GetSplitSettlementsQuery,
  QueryResult<PaginatedResult<SplitSettlementDTO>>
> {
  constructor(private readonly expenseSplitService: ExpenseSplitService) {}

  async handle(
    query: GetSplitSettlementsQuery
  ): Promise<QueryResult<PaginatedResult<SplitSettlementDTO>>> {
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
