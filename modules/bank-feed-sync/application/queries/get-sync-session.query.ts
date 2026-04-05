import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { SyncSessionId } from '../../domain/value-objects/sync-session-id';
import { ISyncSessionRepository } from '../../domain/repositories/sync-session.repository';
import { SyncSession, SyncSessionDTO } from '../../domain/entities/sync-session.entity';
import { SyncSessionNotFoundError } from '../../domain/errors/bank-feed-sync.errors';
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
  constructor(private readonly sessionRepository: ISyncSessionRepository) {}

  async handle(
    query: GetSyncSessionQuery
  ): Promise<QueryResult<SyncSessionDTO>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    const sessionId = SyncSessionId.fromString(query.sessionId);

    const session = await this.sessionRepository.findById(
      sessionId,
      workspaceId
    );

    if (!session) {
      throw new SyncSessionNotFoundError(query.sessionId);
    }

    return QueryResult.success(SyncSession.toDTO(session));
  }
}
