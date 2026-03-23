import { WorkspaceId } from '../../../identity-workspace';
import { SyncSessionId } from '../../domain/value-objects/sync-session-id';
import { SyncSession } from '../../domain/entities/sync-session.entity';
import { ISyncSessionRepository } from '../../domain/repositories/sync-session.repository';
import { SyncSessionNotFoundError } from '../../domain/errors';
import { IQuery, IQueryHandler, QueryResult } from '../../../../apps/api/src/shared/application';
export interface GetSyncSessionQuery extends IQuery {
  workspaceId: string;
  sessionId: string;
}

export class GetSyncSessionHandler implements IQueryHandler<GetSyncSessionQuery, QueryResult<SyncSession>> {
  constructor(private readonly sessionRepository: ISyncSessionRepository) {}

  async handle(query: GetSyncSessionQuery): Promise<QueryResult<SyncSession>> {
    try {
      
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
        
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
