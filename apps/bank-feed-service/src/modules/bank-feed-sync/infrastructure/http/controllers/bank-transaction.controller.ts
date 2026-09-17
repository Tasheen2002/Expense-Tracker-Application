import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { ResponseHelper } from '@shared/response.helper';
import { ProcessTransactionHandler } from '../../../application/commands/process-transaction.command';
import { GetPendingTransactionsHandler } from '../../../application/queries/get-pending-transactions.query';
import { GetBankTransactionHandler } from '../../../application/queries/get-bank-transaction.query';
import { GetTransactionsByConnectionHandler } from '../../../application/queries/get-transactions-by-connection.query';
import {
  WorkspaceParams,
  PendingTransactionsQuery,
  TransactionParams,
  ProcessTransactionBody,
  ConnectionParams,
  PaginationQuery,
} from '../validation/bank-sync.schema';

export class BankTransactionController {
  constructor(
    private readonly processTransactionHandler: ProcessTransactionHandler,
    private readonly getPendingTransactionsHandler: GetPendingTransactionsHandler,
    private readonly getBankTransactionHandler: GetBankTransactionHandler,
    private readonly getTransactionsByConnectionHandler: GetTransactionsByConnectionHandler
  ) {}

  async getPendingTransactions(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Querystring: PendingTransactionsQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { connectionId, limit, offset } = request.query;

      const result = await this.getPendingTransactionsHandler.handle({
        workspaceId,
        connectionId,
        options: {
          limit,
          offset,
        },
      });

      return ResponseHelper.ok(reply, 'Pending transactions retrieved successfully', {
        transactions: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getTransaction(
    request: AuthenticatedRequest<{
      Params: TransactionParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, transactionId } = request.params;

      const transaction = await this.getBankTransactionHandler.handle({
        workspaceId,
        transactionId,
      });

      return ResponseHelper.ok(reply, 'Bank transaction retrieved successfully', transaction);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getTransactionsByConnection(
    request: AuthenticatedRequest<{
      Params: ConnectionParams;
      Querystring: PaginationQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, connectionId } = request.params;
      const { limit, offset } = request.query;

      const result = await this.getTransactionsByConnectionHandler.handle({
        workspaceId,
        connectionId,
        options: {
          limit,
          offset,
        },
      });

      return ResponseHelper.ok(reply, 'Transactions by connection retrieved successfully', {
        transactions: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async processTransaction(
    request: AuthenticatedRequest<{
      Params: TransactionParams;
      Body: ProcessTransactionBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, transactionId } = request.params;
      const body = request.body;

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
}
