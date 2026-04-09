import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
import { ExpenseSplitService } from '../services/expense-split.service';
import { SplitSettlementDTO } from '../../domain/entities/split-settlement.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { SettlementStatus } from '../../domain/enums/settlement-status';

export interface ListUserSettlementsQuery extends IQuery {
  readonly userId: string;
  readonly workspaceId: string;
  readonly status?: SettlementStatus;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListUserSettlementsHandler implements IQueryHandler<ListUserSettlementsQuery, PaginatedResult<SplitSettlementDTO>> {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(query: ListUserSettlementsQuery): Promise<PaginatedResult<SplitSettlementDTO>> {
    return this.splitService.getUserSettlements(
      query.userId,
      query.workspaceId,
      query.status,
      { limit: query.limit, offset: query.offset }
    );
  }
}
