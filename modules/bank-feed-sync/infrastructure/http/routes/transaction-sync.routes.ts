import { FastifyInstance } from "fastify";
import { TransactionSyncController } from "../controllers/transaction-sync.controller";

export async function transactionSyncRoutes(
  fastify: FastifyInstance,
  controller: TransactionSyncController,
) {
  // Trigger sync for a connection
  fastify.post(
    "/:workspaceId/bank-feed-sync/connections/:connectionId/sync",
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
        body: {
          type: "object",
          properties: {
            fromDate: { type: "string", format: "date-time" },
            toDate: { type: "string", format: "date-time" },
          },
        },
      },
    },
    (request, reply) => controller.syncTransactions(request as any, reply),
  );

  // Get sync history for a connection
  fastify.get(
    "/:workspaceId/bank-feed-sync/connections/:connectionId/sync/history",
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
      },
    },
    (request, reply) => controller.getSyncHistory(request as any, reply),
  );

  // Get specific sync session
  fastify.get(
    "/:workspaceId/bank-feed-sync/sync/:sessionId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            sessionId: { type: "string", format: "uuid" },
          },
          required: ["workspaceId", "sessionId"],
        },
      },
    },
    (request, reply) => controller.getSyncSession(request as any, reply),
  );

  // Get all active syncs
  fastify.get(
    "/:workspaceId/bank-feed-sync/sync/active",
    {
      schema: {
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.getActiveSyncs(request as any, reply),
  );
}
