import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { SyncSessionId } from '../../domain/value-objects/sync-session-id';
import { ISyncSessionRepository } from '../../domain/repositories/sync-session.repository';
import { SyncSessionNotFoundError } from '../../domain/errors/bank-feed-sync.errors';
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

export interface GetSyncSessionQuery extends IQuery {
  workspaceId: string;
  sessionId: string;
}

export class GetSyncSessionHandler implements IQueryHandler<
  GetSyncSessionQuery,
  QueryResult<SyncSessionResult>
> {
  constructor(private readonly sessionRepository: ISyncSessionRepository) {}

  async handle(
    query: GetSyncSessionQuery
  ): Promise<QueryResult<SyncSessionResult>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    const sessionId = SyncSessionId.fromString(query.sessionId);

    const session = await this.sessionRepository.findById(
      sessionId,
      workspaceId
    );

    if (!session) {
      throw new SyncSessionNotFoundError(query.sessionId);
    }

    const result: SyncSessionResult = {
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
    };

    return QueryResult.success(result);
  }
}
