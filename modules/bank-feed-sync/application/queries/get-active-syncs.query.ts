import { WorkspaceId } from '../../../identity-workspace';
import { SyncSession } from '../../domain/entities/sync-session.entity';
import { ISyncSessionRepository } from '../../domain/repositories/sync-session.repository';
import { SyncStatus } from '../../domain/enums/sync-status.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import { QueryResult } from '../../../../apps/api/src/shared/application/query-result';

export interface GetActiveSyncsQuery {
  workspaceId: string;
  options?: PaginationOptions;
}

export class GetActiveSyncsHandler {
  constructor(private readonly sessionRepository: ISyncSessionRepository) {}

  async handle(
    query: GetActiveSyncsQuery
  ): Promise<QueryResult<PaginatedResult<SyncSession>>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);

    const result = await this.sessionRepository.findByStatus(
      workspaceId,
      SyncStatus.IN_PROGRESS,
      query.options
    );

    return QueryResult.success(result);
  }
}
