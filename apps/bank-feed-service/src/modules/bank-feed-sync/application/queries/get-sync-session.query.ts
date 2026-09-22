import { TransactionSyncService } from '../services/transaction-sync.service';
import { SyncSessionDTO } from '../../domain/entities/sync-session.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetSyncSessionQuery extends IQuery {
  readonly workspaceId: string;
  readonly sessionId: string;
}

export class GetSyncSessionHandler implements IQueryHandler<
  GetSyncSessionQuery,
  SyncSessionDTO
> {
  constructor(private readonly transactionSyncService: TransactionSyncService) {}

  async handle(query: GetSyncSessionQuery): Promise<SyncSessionDTO> {
    return this.transactionSyncService.getSyncSession(
      query.sessionId,
      query.workspaceId
    );
  }
}
