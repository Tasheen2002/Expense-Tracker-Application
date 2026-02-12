import { FastifyInstance } from "fastify";
import { BankConnectionController } from "../controllers/bank-connection.controller";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from "../../../../../apps/api/src/shared/middleware/rate-limiter.middleware";

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function bankConnectionRoutes(
  fastify: FastifyInstance,
  controller: BankConnectionController,
) {
  // Apply write rate limiting to all mutation routes
  fastify.addHook("preHandler", async (request, reply) => {
    if (request.method !== "GET") {
      await writeRateLimiter(request, reply);
    }
  });
  // Create bank connection
  fastify.post(
    "/:workspaceId/bank-feed-sync/connections",
    {
      schema: {
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: [
            "institutionId",
            "institutionName",
            "accountId",
            "accountName",
            "accountType",
            "currency",
            "accessToken",
          ],
          properties: {
            institutionId: { type: "string" },
            institutionName: { type: "string" },
            accountId: { type: "string" },
            accountName: { type: "string" },
            accountType: { type: "string" },
            currency: { type: "string" },
            accessToken: { type: "string" },
            accountMask: { type: "string" },
            tokenExpiresAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    (request, reply) => controller.connectBank(request as AuthenticatedRequest, reply),
  );

  // Get all connections
  fastify.get(
    "/:workspaceId/bank-feed-sync/connections",
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
    (request, reply) => controller.getConnections(request as AuthenticatedRequest, reply),
  );

  // Get specific connection
  fastify.get(
    "/:workspaceId/bank-feed-sync/connections/:connectionId",
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
    (request, reply) => controller.getConnection(request as AuthenticatedRequest, reply),
  );

  // Update connection token
  fastify.put(
    "/:workspaceId/bank-feed-sync/connections/:connectionId/token",
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
          required: ["accessToken"],
          properties: {
            accessToken: { type: "string" },
            tokenExpiresAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    (request, reply) => controller.updateConnectionToken(request as AuthenticatedRequest, reply),
  );

  // Disconnect bank
  fastify.put(
    "/:workspaceId/bank-feed-sync/connections/:connectionId/disconnect",
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
    (request, reply) => controller.disconnectBank(request as AuthenticatedRequest, reply),
  );

  // Delete connection
  fastify.delete(
    "/:workspaceId/bank-feed-sync/connections/:connectionId",
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
    (request, reply) => controller.deleteConnection(request as AuthenticatedRequest, reply),
  );
}
