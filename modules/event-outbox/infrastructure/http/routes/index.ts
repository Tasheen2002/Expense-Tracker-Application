import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { outboxEventRoutes } from "./outbox-event.routes";
import { OutboxEventController } from "../controllers/outbox-event.controller";
import { workspaceAuthorizationMiddleware } from "../../../../../apps/api/src/shared/middleware";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";

export async function registerEventOutboxRoutes(
  fastify: FastifyInstance,
  controllers: {
    outboxEventController: OutboxEventController;
  },
  prisma: PrismaClient,
) {
  await fastify.register(
    async (instance) => {
      // First authenticate the request
      instance.addHook("onRequest", async (request, reply) => {
        await fastify.authenticate(request);
      });

      // Then authorize workspace access
      instance.addHook("preHandler", async (request, reply) => {
        await workspaceAuthorizationMiddleware(
          request as AuthenticatedRequest,
          reply,
          prisma,
        );
      });

      // Register outbox event routes
      await outboxEventRoutes(instance, controllers.outboxEventController);
    },
    { prefix: "/api/v1" },
  );
}
