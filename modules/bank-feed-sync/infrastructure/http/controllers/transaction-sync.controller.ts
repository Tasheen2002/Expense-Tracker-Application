import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { SyncTransactionsHandler } from "../../../application/commands/sync-transactions.command";
import { GetSyncHistoryHandler } from "../../../application/queries/get-sync-history.query";
import { TransactionSyncService } from "../../../application/services/transaction-sync.service";
import { syncTransactionsSchema } from "../validation/transaction-sync.schema";

export class TransactionSyncController {
  constructor(
    private readonly syncTransactionsHandler: SyncTransactionsHandler,
    private readonly getSyncHistoryHandler: GetSyncHistoryHandler,
    private readonly transactionSyncService: TransactionSyncService,
  ) {}

  async syncTransactions(request: AuthenticatedRequest, reply: FastifyReply) {
    const { workspaceId, connectionId } = request.params as {
      workspaceId: string;
      connectionId: string;
    };

    const bodyResult = syncTransactionsSchema.safeParse(request.body || {});
    if (!bodyResult.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid request body",
        details: bodyResult.error.errors,
      });
    }

    const body = bodyResult.data;

    const session = await this.syncTransactionsHandler.handle({
      workspaceId,
      connectionId,
      fromDate: body.startDate ? new Date(body.startDate) : undefined,
      toDate: body.endDate ? new Date(body.endDate) : undefined,
    });

    return reply.status(202).send({
      id: session.getId().getValue(),
      workspaceId: session.getWorkspaceId().getValue(),
      connectionId: session.getConnectionId().getValue(),
      status: session.getStatus(),
      startedAt: session.getStartedAt(),
      completedAt: session.getCompletedAt(),
      transactionsFetched: session.getTransactionsFetched(),
      transactionsImported: session.getTransactionsImported(),
      transactionsDuplicate: session.getTransactionsDuplicate(),
      errorMessage: session.getErrorMessage(),
      createdAt: session.getCreatedAt(),
      updatedAt: session.getUpdatedAt(),
    });
  }

  async getSyncHistory(request: AuthenticatedRequest, reply: FastifyReply) {
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

    return reply.send({
      sessions: result.items.map((s) => ({
        id: s.getId().getValue(),
        workspaceId: s.getWorkspaceId().getValue(),
        connectionId: s.getConnectionId().getValue(),
        status: s.getStatus(),
        startedAt: s.getStartedAt(),
        completedAt: s.getCompletedAt(),
        transactionsFetched: s.getTransactionsFetched(),
        transactionsImported: s.getTransactionsImported(),
        transactionsDuplicate: s.getTransactionsDuplicate(),
        errorMessage: s.getErrorMessage(),
        createdAt: s.getCreatedAt(),
        updatedAt: s.getUpdatedAt(),
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }

  async getSyncSession(request: AuthenticatedRequest, reply: FastifyReply) {
    const { workspaceId, sessionId } = request.params as {
      workspaceId: string;
      sessionId: string;
    };

    const session = await this.transactionSyncService.getSyncSession(
      workspaceId,
      sessionId,
    );

    return reply.send({
      id: session.getId().getValue(),
      workspaceId: session.getWorkspaceId().getValue(),
      connectionId: session.getConnectionId().getValue(),
      status: session.getStatus(),
      startedAt: session.getStartedAt(),
      completedAt: session.getCompletedAt(),
      transactionsFetched: session.getTransactionsFetched(),
      transactionsImported: session.getTransactionsImported(),
      transactionsDuplicate: session.getTransactionsDuplicate(),
      errorMessage: session.getErrorMessage(),
      metadata: session.getMetadata(),
      createdAt: session.getCreatedAt(),
      updatedAt: session.getUpdatedAt(),
    });
  }

  async getActiveSyncs(request: AuthenticatedRequest, reply: FastifyReply) {
    const { workspaceId } = request.params as { workspaceId: string };
    const { limit, offset } = request.query as {
      limit?: string;
      offset?: string;
    };

    const result = await this.transactionSyncService.getActiveSyncs(
      workspaceId,
      {
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      },
    );

    return reply.send({
      sessions: result.items.map((s) => ({
        id: s.getId().getValue(),
        connectionId: s.getConnectionId().getValue(),
        status: s.getStatus(),
        startedAt: s.getStartedAt(),
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }
}
