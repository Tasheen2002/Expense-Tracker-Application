import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';
import { ProcessTransactionHandler } from '../../../application/commands/process-transaction.command';
import { GetPendingTransactionsHandler } from '../../../application/queries/get-pending-transactions.query';
import { GetBankTransactionHandler } from '../../../application/queries/get-bank-transaction.query';
import { GetTransactionsByConnectionHandler } from '../../../application/queries/get-transactions-by-connection.query';

export class BankTransactionController {
  constructor(
    private readonly processTransactionHandler: ProcessTransactionHandler,
    private readonly getPendingTransactionsHandler: GetPendingTransactionsHandler,
    private readonly getBankTransactionHandler: GetBankTransactionHandler,
    private readonly getTransactionsByConnectionHandler: GetTransactionsByConnectionHandler
  ) {}

  async getPendingTransactions(
    request: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const { connectionId, limit, offset } = request.query as {
        connectionId?: string;
        limit?: string;
        offset?: string;
      };

      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      const parsedOffset = offset ? parseInt(offset, 10) : undefined;

      const result = await this.getPendingTransactionsHandler.handle({
        workspaceId,
        connectionId,
        options: {
          limit:
            parsedLimit !== undefined
              ? Math.min(
                  Math.max(1, isNaN(parsedLimit) ? 50 : parsedLimit),
                  100
                )
              : undefined,
          offset:
            parsedOffset !== undefined
              ? Math.max(0, isNaN(parsedOffset) ? 0 : parsedOffset)
              : undefined,
        },
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Pending transactions retrieved successfully',
        result.data
          ? {
              transactions: result.data.items.map((t) => t.toJSON()),
              total: result.data.total,
              limit: result.data.limit,
              offset: result.data.offset,
              hasMore: result.data.hasMore,
            }
          : undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getTransaction(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { workspaceId, transactionId } = request.params as {
        workspaceId: string;
        transactionId: string;
      };

      const result = await this.getBankTransactionHandler.handle({
        workspaceId,
        transactionId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Bank transaction retrieved successfully',
        result.data?.toJSON()
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async processTransaction(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const { workspaceId, transactionId } = request.params as {
        workspaceId: string;
        transactionId: string;
      };
      const body = request.body as {
        action: 'import' | 'match' | 'ignore';
        expenseId?: string;
      };

      const result = await this.processTransactionHandler.handle({
        workspaceId,
        transactionId,
        action: body.action,
        expenseId: body.expenseId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Transaction processed successfully',
        undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getTransactionsByConnection(
    request: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, connectionId } = request.params as {
        workspaceId: string;
        connectionId: string;
      };
      const { limit, offset } = request.query as {
        limit?: string;
        offset?: string;
      };

      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      const parsedOffset = offset ? parseInt(offset, 10) : undefined;

      const result = await this.getTransactionsByConnectionHandler.handle({
        workspaceId,
        connectionId,
        options: {
          limit:
            parsedLimit !== undefined
              ? Math.min(
                  Math.max(1, isNaN(parsedLimit) ? 50 : parsedLimit),
                  100
                )
              : undefined,
          offset:
            parsedOffset !== undefined
              ? Math.max(0, isNaN(parsedOffset) ? 0 : parsedOffset)
              : undefined,
        },
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Transactions by connection retrieved successfully',
        result.data
          ? {
              transactions: result.data.items.map((t) => t.toJSON()),
              total: result.data.total,
              limit: result.data.limit,
              offset: result.data.offset,
              hasMore: result.data.hasMore,
            }
          : undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
