import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
import { ExpenseSplitService } from '../services/expense-split.service';
import { SplitSettlementDTO } from '../../domain/entities/split-settlement.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface GetSplitSettlementsQuery extends IQuery {
  readonly splitId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class GetSplitSettlementsHandler implements IQueryHandler<GetSplitSettlementsQuery, PaginatedResult<SplitSettlementDTO>> {
  constructor(private readonly expenseSplitService: ExpenseSplitService) {}

  async handle(query: GetSplitSettlementsQuery): Promise<PaginatedResult<SplitSettlementDTO>> {
    return this.expenseSplitService.getSplitSettlements(
      query.splitId,
      query.workspaceId,
      query.userId
    );
  }
}
