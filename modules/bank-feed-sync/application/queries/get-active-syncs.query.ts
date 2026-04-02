import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { ISyncSessionRepository } from '../../domain/repositories/sync-session.repository';
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

export interface SyncSessionResult {
  id: string;
  workspaceId: string;
  connectionId: string;
  status: string;
  startedAt: Date;
  completedAt?: Date;
  transactionsFetched: number;
  transactionsImported: number;
  transactionsDuplicate: number;
  errorMessage?: string;
}

export interface GetActiveSyncsQuery extends IQuery {
  workspaceId: string;
  options?: PaginationOptions;
}

export class GetActiveSyncsHandler implements IQueryHandler<
  GetActiveSyncsQuery,
  QueryResult<PaginatedResult<SyncSessionResult>>
> {
  constructor(private readonly sessionRepository: ISyncSessionRepository) {}

  async handle(
    query: GetActiveSyncsQuery
  ): Promise<QueryResult<PaginatedResult<SyncSessionResult>>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);

    const result = await this.sessionRepository.findByStatus(
      workspaceId,
      SyncStatus.IN_PROGRESS,
      query.options
    );

    const dtoResult: PaginatedResult<SyncSessionResult> = {
      ...result,
      items: result.items.map((session) => ({
        id: session.id.getValue(),
        workspaceId: session.workspaceId.getValue(),
        connectionId: session.connectionId.getValue(),
        status: session.status,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        transactionsFetched: session.transactionsFetched,
        transactionsImported: session.transactionsImported,
        transactionsDuplicate: session.transactionsDuplicate,
        errorMessage: session.errorMessage,
      })),
    };

    return QueryResult.success(dtoResult);
  }
}
