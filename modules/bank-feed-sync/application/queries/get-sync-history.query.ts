import { TransactionSyncService } from '../services/transaction-sync.service';
import { SyncSessionDTO } from '../../domain/entities/sync-session.entity';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetSyncHistoryQuery extends IQuery {
  readonly workspaceId: string;
  readonly connectionId: string;
  readonly options?: PaginationOptions;
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
