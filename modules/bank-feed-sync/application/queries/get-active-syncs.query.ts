import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { ISyncSessionRepository } from '../../domain/repositories/sync-session.repository';
import { SyncSession, SyncSessionDTO } from '../../domain/entities/sync-session.entity';
import { SyncStatus } from '../../domain/enums/sync-status.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetActiveSyncsQuery extends IQuery {
  workspaceId: string;
  options?: PaginationOptions;
}

export class GetActiveSyncsHandler implements IQueryHandler<
  GetActiveSyncsQuery,
  QueryResult<PaginatedResult<SyncSessionDTO>>
> {
  constructor(private readonly sessionRepository: ISyncSessionRepository) {}

  async handle(
    query: GetActiveSyncsQuery
  ): Promise<QueryResult<PaginatedResult<SyncSessionDTO>>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);

    const result = await this.sessionRepository.findByStatus(
      workspaceId,
      SyncStatus.IN_PROGRESS,
      query.options
    );

    const dtoResult: PaginatedResult<SyncSessionDTO> = {
      ...result,
      items: result.items.map((session) => SyncSession.toDTO(session)),
    };

    return QueryResult.success(dtoResult);
  }
}
