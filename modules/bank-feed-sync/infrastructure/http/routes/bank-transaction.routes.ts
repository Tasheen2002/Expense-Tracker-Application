import { FastifyInstance } from "fastify";
import { BankTransactionController } from "../controllers/bank-transaction.controller";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";

export async function bankTransactionRoutes(
  fastify: FastifyInstance,
  controller: BankTransactionController,
) {
  // Get pending transactions
  fastify.get(
    "/:workspaceId/bank-feed-sync/transactions/pending",
    {
      schema: {
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            connectionId: { type: "string", format: "uuid" },
            limit: { type: "string" },
            offset: { type: "string" },
          },
        },
      },
    },
    (request, reply) =>
      controller.getPendingTransactions(request as AuthenticatedRequest, reply),
  );

  // Get specific transaction
  fastify.get(
    "/:workspaceId/bank-feed-sync/transactions/:transactionId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            transactionId: { type: "string", format: "uuid" },
          },
          required: ["workspaceId", "transactionId"],
        },
      },
    },
    (request, reply) => controller.getTransaction(request as AuthenticatedRequest, reply),
  );

  // Process transaction (import/match/ignore)
  fastify.put(
    "/:workspaceId/bank-feed-sync/transactions/:transactionId/process",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            transactionId: { type: "string", format: "uuid" },
          },
          required: ["workspaceId", "transactionId"],
        },
        body: {
          type: "object",
          required: ["action"],
          properties: {
            action: { type: "string", enum: ["import", "match", "ignore"] },
            expenseId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.processTransaction(request as AuthenticatedRequest, reply),
  );

  // Get transactions by connection
  fastify.get(
    "/:workspaceId/bank-feed-sync/transactions/connection/:connectionId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            connectionId: { type: "string", format: "uuid" },
          },
          required: ["workspaceId", "connectionId"],
        },
        querystring: {
          type: "object",
          properties: {
            limit: { type: "string" },
            offset: { type: "string" },
          },
        },
      },
    },
    (request, reply) =>
      controller.getTransactionsByConnection(request as AuthenticatedRequest, reply),
  );
}
