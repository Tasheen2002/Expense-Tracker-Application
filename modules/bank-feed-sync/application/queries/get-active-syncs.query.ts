import { TransactionSyncService } from '../services/transaction-sync.service';
import { SyncSessionDTO } from '../../domain/entities/sync-session.entity';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetActiveSyncsQuery extends IQuery {
  workspaceId: string;
  options?: PaginationOptions;
}

export class GetActiveSyncsHandler implements IQueryHandler<
  GetActiveSyncsQuery,
  QueryResult<PaginatedResult<SyncSessionDTO>>
> {
  constructor(private readonly transactionSyncService: TransactionSyncService) {}

  async handle(
    query: GetActiveSyncsQuery
  ): Promise<QueryResult<PaginatedResult<SyncSessionDTO>>> {
    const result = await this.transactionSyncService.getActiveSyncs(
      query.workspaceId,
      query.options
    );
    return QueryResult.success(result);
  }
}
