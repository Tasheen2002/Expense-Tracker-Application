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

export interface GetSyncHistoryQuery extends IQuery {
  workspaceId: string;
  connectionId: string;
  options?: PaginationOptions;
}

export class GetSyncHistoryHandler implements IQueryHandler<
  GetSyncHistoryQuery,
  PaginatedResult<SyncSessionDTO>
> {
  constructor(private readonly transactionSyncService: TransactionSyncService) {}

  async handle(query: GetSyncHistoryQuery): Promise<PaginatedResult<SyncSessionDTO>> {
    return this.transactionSyncService.getSyncHistory(
      query.workspaceId,
      query.connectionId,
      query.options
    );
  }
}
