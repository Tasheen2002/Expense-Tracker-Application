import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { ISyncSessionRepository } from '../../domain/repositories/sync-session.repository';
import { SyncSession, SyncSessionDTO } from '../../domain/entities/sync-session.entity';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetSyncHistoryQuery extends IQuery {
  workspaceId: string;
  connectionId: string;
  options?: PaginationOptions;
}

export class GetSyncHistoryHandler implements IQueryHandler<
  GetSyncHistoryQuery,
  QueryResult<PaginatedResult<SyncSessionDTO>>
> {
  constructor(private readonly sessionRepository: ISyncSessionRepository) {}

  async handle(
    query: GetSyncHistoryQuery
  ): Promise<QueryResult<PaginatedResult<SyncSessionDTO>>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    const connectionId = BankConnectionId.fromString(query.connectionId);

    const result = await this.sessionRepository.findByConnection(
      workspaceId,
      connectionId,
      query.options
    );

    const dtoResult: PaginatedResult<SyncSessionDTO> = {
      ...result,
      items: result.items.map((session) => SyncSession.toDTO(session)),
    };

    return QueryResult.success(dtoResult);
  }
}
