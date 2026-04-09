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

export interface GetActiveSyncsQuery extends IQuery {
  workspaceId: string;
  options?: PaginationOptions;
}

export class GetActiveSyncsHandler implements IQueryHandler<
  GetActiveSyncsQuery,
  PaginatedResult<SyncSessionDTO>
> {
  constructor(private readonly transactionSyncService: TransactionSyncService) {}

  async handle(query: GetActiveSyncsQuery): Promise<PaginatedResult<SyncSessionDTO>> {
    return this.transactionSyncService.getActiveSyncs(
      query.workspaceId,
      query.options
    );
  }
}
