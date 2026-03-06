import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { budgetRoutes } from "./budget.routes";
import { spendingLimitRoutes } from "./spending-limit.routes";
import { BudgetController } from "../controllers/budget.controller";
import { SpendingLimitController } from "../controllers/spending-limit.controller";
import { workspaceAuthorizationMiddleware } from "../../../../../apps/api/src/shared/middleware";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";

export async function registerBudgetRoutes(
  fastify: FastifyInstance,
  controllers: {
    budgetController: BudgetController;
    spendingLimitController: SpendingLimitController;
  },
  prisma: PrismaClient,
) {
  await fastify.register(
    async (instance) => {
      // First authenticate, then authorize workspace access
      instance.addHook("onRequest", async (request, reply) => {
        await fastify.authenticate(request);
      });
      instance.addHook("preHandler", async (request, reply) => {
        await workspaceAuthorizationMiddleware(
          request as AuthenticatedRequest,
          reply,
          prisma,
        );
      });

      await budgetRoutes(instance, controllers.budgetController);
      await spendingLimitRoutes(instance, controllers.spendingLimitController);
    },
    { prefix: "/api/v1" },
  );
}
