import { TransactionSyncService } from '../services/transaction-sync.service';
import { SyncSessionDTO } from '../../domain/entities/sync-session.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetSyncSessionQuery extends IQuery {
  workspaceId: string;
  sessionId: string;
}

export class GetSyncSessionHandler implements IQueryHandler<
  GetSyncSessionQuery,
  QueryResult<SyncSessionDTO>
> {
  constructor(private readonly transactionSyncService: TransactionSyncService) {}

  async handle(
    query: GetSyncSessionQuery
  ): Promise<QueryResult<SyncSessionDTO>> {
    const dto = await this.transactionSyncService.getSyncSession(
      query.sessionId,
      query.workspaceId
    );
    return QueryResult.success(dto);
  }
}
