import { WorkspaceId } from '../../../identity-workspace';
import { SyncSession } from '../../domain/entities/sync-session.entity';
import { ISyncSessionRepository } from '../../domain/repositories/sync-session.repository';
import { SyncStatus } from '../../domain/enums/sync-status.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import { IQuery, IQueryHandler, QueryResult } from '../../../../apps/api/src/shared/application';
export interface GetActiveSyncsQuery extends IQuery {
  workspaceId: string;
  options?: PaginationOptions;
}

export class GetActiveSyncsHandler implements IQueryHandler<GetActiveSyncsQuery, QueryResult<PaginatedResult<SyncSession>>> {
  constructor(private readonly sessionRepository: ISyncSessionRepository) {}

  async handle(
    query: GetActiveSyncsQuery
  ): Promise<QueryResult<PaginatedResult<SyncSession>>> {
    try {
      
          const workspaceId = WorkspaceId.fromString(query.workspaceId);
      
          const result = await this.sessionRepository.findByStatus(
            workspaceId,
            SyncStatus.IN_PROGRESS,
            query.options
          );
      
          return QueryResult.success(result);
        
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
