import { FastifyInstance } from "fastify";
import { TransactionSyncController } from "../controllers/transaction-sync.controller";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";

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
    (request, reply) => controller.syncTransactions(request as AuthenticatedRequest, reply),
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
        querystring: {
          type: "object",
          properties: {
            limit: { type: "string" },
            offset: { type: "string" },
          },
        },
      },
    },
    (request, reply) => controller.getSyncHistory(request as AuthenticatedRequest, reply),
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
    (request, reply) => controller.getSyncSession(request as AuthenticatedRequest, reply),
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
        querystring: {
          type: "object",
          properties: {
            limit: { type: "string" },
            offset: { type: "string" },
          },
        },
      },
    },
    (request, reply) => controller.getActiveSyncs(request as AuthenticatedRequest, reply),
  );
}
