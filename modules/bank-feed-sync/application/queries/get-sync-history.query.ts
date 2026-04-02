import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { ISyncSessionRepository } from '../../domain/repositories/sync-session.repository';
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

export interface GetSyncHistoryQuery extends IQuery {
  workspaceId: string;
  connectionId: string;
  options?: PaginationOptions;
}

export class GetSyncHistoryHandler implements IQueryHandler<
  GetSyncHistoryQuery,
  QueryResult<PaginatedResult<SyncSessionResult>>
> {
  constructor(private readonly sessionRepository: ISyncSessionRepository) {}

  async handle(
    query: GetSyncHistoryQuery
  ): Promise<QueryResult<PaginatedResult<SyncSessionResult>>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    const connectionId = BankConnectionId.fromString(query.connectionId);

    const result = await this.sessionRepository.findByConnection(
      workspaceId,
      connectionId,
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
