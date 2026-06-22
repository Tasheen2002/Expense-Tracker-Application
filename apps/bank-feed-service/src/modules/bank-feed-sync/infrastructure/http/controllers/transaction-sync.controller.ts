import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '@shared/response.helper';
import { SyncTransactionsHandler } from '../../../application/commands/sync-transactions.command';
import { GetSyncHistoryHandler } from '../../../application/queries/get-sync-history.query';
import { GetSyncSessionHandler } from '../../../application/queries/get-sync-session.query';
import { GetActiveSyncsHandler } from '../../../application/queries/get-active-syncs.query';
import {
  ConnectionParams,
  PaginationQuery,
  SessionParams,
  SyncTransactionsBody,
  WorkspaceParams,
} from '../validation/bank-sync.schema';

export class TransactionSyncController {
  constructor(
    private readonly syncTransactionsHandler: SyncTransactionsHandler,
    private readonly getSyncHistoryHandler: GetSyncHistoryHandler,
    private readonly getSyncSessionHandler: GetSyncSessionHandler,
    private readonly getActiveSyncsHandler: GetActiveSyncsHandler
  ) {}

  async getSyncHistory(
    request: AuthenticatedRequest<{
      Params: ConnectionParams;
      Querystring: PaginationQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, connectionId } = request.params;
      const { limit, offset } = request.query;

      const result = await this.getSyncHistoryHandler.handle({
        workspaceId,
        connectionId,
        options: {
          limit,
          offset,
        },
      });

      return ResponseHelper.ok(reply, 'Sync history retrieved successfully', {
        sessions: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getSyncSession(
    request: AuthenticatedRequest<{
      Params: SessionParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, sessionId } = request.params;

      const session = await this.getSyncSessionHandler.handle({
        workspaceId,
        sessionId,
      });

      return ResponseHelper.ok(reply, 'Sync session retrieved successfully', session);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getActiveSyncs(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Querystring: PaginationQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { limit, offset } = request.query;

      const result = await this.getActiveSyncsHandler.handle({
        workspaceId,
        options: {
          limit,
          offset,
        },
      });

      return ResponseHelper.ok(reply, 'Active syncs retrieved successfully', {
        sessions: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async syncTransactions(
    request: AuthenticatedRequest<{
      Params: ConnectionParams;
      Body: SyncTransactionsBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, connectionId } = request.params;
      const body = request.body ?? {};

      // Fallback: Support startDate/endDate if sent instead of fromDate/toDate
      const fromDate = body.fromDate ?? body.startDate;
      const toDate = body.toDate ?? body.endDate;

      const result = await this.syncTransactionsHandler.handle({
        workspaceId,
        connectionId,
        fromDate,
        toDate,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Sync initiated successfully',
        result.data ? { sessionId: result.data.id } : undefined,
        202
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
