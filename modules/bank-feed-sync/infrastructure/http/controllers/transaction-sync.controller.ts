import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '@shared/response.helper';
import { SyncTransactionsHandler } from '../../../application/commands/sync-transactions.command';
import { GetSyncHistoryHandler } from '../../../application/queries/get-sync-history.query';
import { GetSyncSessionHandler } from '../../../application/queries/get-sync-session.query';
import { GetActiveSyncsHandler } from '../../../application/queries/get-active-syncs.query';

export class TransactionSyncController {
  constructor(
    private readonly syncTransactionsHandler: SyncTransactionsHandler,
    private readonly getSyncHistoryHandler: GetSyncHistoryHandler,
    private readonly getSyncSessionHandler: GetSyncSessionHandler,
    private readonly getActiveSyncsHandler: GetActiveSyncsHandler
  ) {}

  async syncTransactions(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { workspaceId, connectionId } = request.params as {
        workspaceId: string;
        connectionId: string;
      };
      const body =
        (request.body as {
          startDate?: string;
          endDate?: string;
        }) ?? {};

      const result = await this.syncTransactionsHandler.handle({
        workspaceId,
        connectionId,
        fromDate: body.startDate ? new Date(body.startDate) : undefined,
        toDate: body.endDate ? new Date(body.endDate) : undefined,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Sync initiated successfully',
        result.data ? { sessionId: result.data.id } : undefined,
        202
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getSyncHistory(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { workspaceId, connectionId } = request.params as {
        workspaceId: string;
        connectionId: string;
      };
      const { limit, offset } = request.query as {
        limit?: string;
        offset?: string;
      };

      const result = await this.getSyncHistoryHandler.handle({
        workspaceId,
        connectionId,
        options: {
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        },
      });

      return ResponseHelper.ok(reply, 'Sync history retrieved successfully', {
        sessions: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      });
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getSyncSession(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { workspaceId, sessionId } = request.params as {
        workspaceId: string;
        sessionId: string;
      };

      const session = await this.getSyncSessionHandler.handle({
        workspaceId,
        sessionId,
      });

      return ResponseHelper.ok(reply, 'Sync session retrieved successfully', session);
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getActiveSyncs(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const { limit, offset } = request.query as {
        limit?: string;
        offset?: string;
      };

      const result = await this.getActiveSyncsHandler.handle({
        workspaceId,
        options: {
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        },
      });

      return ResponseHelper.ok(reply, 'Active syncs retrieved successfully', {
        sessions: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      });
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
