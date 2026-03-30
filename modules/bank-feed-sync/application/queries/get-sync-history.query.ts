import { WorkspaceId } from '../../../identity-workspace';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { SyncSession } from '../../domain/entities/sync-session.entity';
import { ISyncSessionRepository } from '../../domain/repositories/sync-session.repository';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import { QueryResult } from '../../../../apps/api/src/shared/application/query-result';

export interface GetSyncHistoryQuery {
  workspaceId: string;
  connectionId: string;
  options?: PaginationOptions;
}

export class GetSyncHistoryHandler {
  constructor(private readonly sessionRepository: ISyncSessionRepository) {}

  async handle(
    query: GetSyncHistoryQuery
  ): Promise<QueryResult<PaginatedResult<SyncSession>>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    const connectionId = BankConnectionId.fromString(query.connectionId);

    const result = await this.sessionRepository.findByConnection(
      workspaceId,
      connectionId,
      query.options
    );

    return QueryResult.success(result);
  }
}
