import { WorkspaceId } from '../../../identity-workspace';
import { SyncSessionId } from '../../domain/value-objects/sync-session-id';
import { SyncSession } from '../../domain/entities/sync-session.entity';
import { ISyncSessionRepository } from '../../domain/repositories/sync-session.repository';
import { SyncSessionNotFoundError } from '../../domain/errors';
import { QueryResult } from '../../../../apps/api/src/shared/application/query-result';

export interface GetSyncSessionQuery {
  workspaceId: string;
  sessionId: string;
}

export class GetSyncSessionHandler {
  constructor(private readonly sessionRepository: ISyncSessionRepository) {}

  async handle(query: GetSyncSessionQuery): Promise<QueryResult<SyncSession>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    const sessionId = SyncSessionId.fromString(query.sessionId);

    const session = await this.sessionRepository.findById(
      sessionId,
      workspaceId
    );

    if (!session) {
      throw new SyncSessionNotFoundError(query.sessionId);
    }

    return QueryResult.success(session);
  }
}
