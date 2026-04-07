import { TransactionSyncService } from '../services/transaction-sync.service';
import { BankConnectionDTO } from '../../domain/entities/bank-connection.entity';
import {
  PaginatedResult,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetBankConnectionsQuery extends IQuery {
  workspaceId: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export class GetBankConnectionsHandler implements IQueryHandler<
  GetBankConnectionsQuery,
  QueryResult<PaginatedResult<BankConnectionDTO>>
> {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(
    query: GetBankConnectionsQuery
  ): Promise<QueryResult<PaginatedResult<BankConnectionDTO>>> {
    const result = await this.transactionSyncService.getConnections(
      query.workspaceId,
      query.userId,
      { limit: query.limit, offset: query.offset }
    );
    return QueryResult.success(result);
  }
}
