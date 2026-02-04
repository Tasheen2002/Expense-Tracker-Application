import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { ProcessTransactionHandler } from "../../../application/commands/process-transaction.command";
import { GetPendingTransactionsHandler } from "../../../application/queries/get-pending-transactions.query";
import { BankTransactionService } from "../../../application/services/bank-transaction.service";
import {
  processTransactionSchema,
  pendingTransactionsQuerySchema,
} from "../validation/bank-transaction.schema";

export class BankTransactionController {
  constructor(
    private readonly processTransactionHandler: ProcessTransactionHandler,
    private readonly getPendingTransactionsHandler: GetPendingTransactionsHandler,
    private readonly bankTransactionService: BankTransactionService,
  ) {}

  async getPendingTransactions(
    request: AuthenticatedRequest,
    reply: FastifyReply,
  ) {
    const { workspaceId } = request.params as { workspaceId: string };

    const queryResult = pendingTransactionsQuerySchema.safeParse(
      request.query || {},
    );
    if (!queryResult.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid query parameters",
        details: queryResult.error.errors,
      });
    }

    const { connectionId } = queryResult.data;
    const { limit, offset } = request.query as {
      limit?: string;
      offset?: string;
    };

    const result = await this.getPendingTransactionsHandler.handle({
      workspaceId,
      connectionId,
      options: {
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      },
    });

    return reply.send({
      transactions: result.items.map((t) => ({
        id: t.getId().getValue(),
        workspaceId: t.getWorkspaceId().getValue(),
        connectionId: t.getConnectionId().getValue(),
        sessionId: t.getSessionId().getValue(),
        externalId: t.getExternalId(),
        amount: t.getAmount(),
        currency: t.getCurrency(),
        description: t.getDescription(),
        merchantName: t.getMerchantName(),
        categoryName: t.getCategoryName(),
        transactionDate: t.getTransactionDate(),
        postedDate: t.getPostedDate(),
        status: t.getStatus(),
        expenseId: t.getExpenseId(),
        createdAt: t.getCreatedAt(),
        updatedAt: t.getUpdatedAt(),
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }

  async getTransaction(request: AuthenticatedRequest, reply: FastifyReply) {
    const { workspaceId, transactionId } = request.params as {
      workspaceId: string;
      transactionId: string;
    };

    const transaction = await this.bankTransactionService.getTransaction(
      workspaceId,
      transactionId,
    );

    return reply.send({
      id: transaction.getId().getValue(),
      workspaceId: transaction.getWorkspaceId().getValue(),
      connectionId: transaction.getConnectionId().getValue(),
      sessionId: transaction.getSessionId().getValue(),
      externalId: transaction.getExternalId(),
      amount: transaction.getAmount(),
      currency: transaction.getCurrency(),
      description: transaction.getDescription(),
      merchantName: transaction.getMerchantName(),
      categoryName: transaction.getCategoryName(),
      transactionDate: transaction.getTransactionDate(),
      postedDate: transaction.getPostedDate(),
      status: transaction.getStatus(),
      expenseId: transaction.getExpenseId(),
      metadata: transaction.getMetadata(),
      createdAt: transaction.getCreatedAt(),
      updatedAt: transaction.getUpdatedAt(),
    });
  }

  async processTransaction(request: AuthenticatedRequest, reply: FastifyReply) {
    const { workspaceId, transactionId } = request.params as {
      workspaceId: string;
      transactionId: string;
    };

    const bodyResult = processTransactionSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid request body",
        details: bodyResult.error.errors,
      });
    }

    const body = bodyResult.data;

    const transaction = await this.processTransactionHandler.handle({
      workspaceId,
      transactionId,
      action: body.action,
      expenseId: body.expenseId,
    });

    return reply.send({
      id: transaction.getId().getValue(),
      status: transaction.getStatus(),
      expenseId: transaction.getExpenseId(),
      updatedAt: transaction.getUpdatedAt(),
    });
  }

  async getTransactionsByConnection(
    request: AuthenticatedRequest,
    reply: FastifyReply,
  ) {
    const { workspaceId, connectionId } = request.params as {
      workspaceId: string;
      connectionId: string;
    };

    const { limit, offset } = request.query as {
      limit?: string;
      offset?: string;
    };

    const result =
      await this.bankTransactionService.getTransactionsByConnection(
        workspaceId,
        connectionId,
        {
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        },
      );

    return reply.send({
      transactions: result.items.map((t) => ({
        id: t.getId().getValue(),
        externalId: t.getExternalId(),
        amount: t.getAmount(),
        currency: t.getCurrency(),
        description: t.getDescription(),
        merchantName: t.getMerchantName(),
        transactionDate: t.getTransactionDate(),
        status: t.getStatus(),
        expenseId: t.getExpenseId(),
        createdAt: t.getCreatedAt(),
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }
}
