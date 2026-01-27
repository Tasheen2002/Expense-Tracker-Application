import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { allocationManagementRoutes } from "./allocation-management.routes";
import { expenseAllocationRoutes } from "./expense-allocation.routes";
import { AllocationManagementController } from "../controllers/allocation-management.controller";
import { ExpenseAllocationController } from "../controllers/expense-allocation.controller";
import { workspaceAuthorizationMiddleware } from "../../../../../apps/api/src/shared/middleware";

export async function registerCostAllocationRoutes(
  fastify: FastifyInstance,
  controllers: {
    allocationManagementController: AllocationManagementController;
    expenseAllocationController: ExpenseAllocationController;
  },
  prisma: PrismaClient,
) {
  await fastify.register(
    async (instance) => {
      // Add workspace authorization middleware to all routes
      instance.addHook("onRequest", async (request, reply) => {
        await workspaceAuthorizationMiddleware(request as any, reply, prisma);
      });

      await allocationManagementRoutes(
        instance,
        controllers.allocationManagementController,
      );
      await expenseAllocationRoutes(
        instance,
        controllers.expenseAllocationController,
      );
    },
    { prefix: "/api/v1" },
  );
}
