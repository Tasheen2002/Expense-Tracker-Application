import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { bankConnectionRoutes } from "./bank-connection.routes";
import { transactionSyncRoutes } from "./transaction-sync.routes";
import { bankTransactionRoutes } from "./bank-transaction.routes";
import { BankConnectionController } from "../controllers/bank-connection.controller";
import { TransactionSyncController } from "../controllers/transaction-sync.controller";
import { BankTransactionController } from "../controllers/bank-transaction.controller";
import { workspaceAuthorizationMiddleware } from "../../../../../apps/api/src/shared/middleware";

export async function registerBankFeedSyncRoutes(
  fastify: FastifyInstance,
  controllers: {
    bankConnectionController: BankConnectionController;
    transactionSyncController: TransactionSyncController;
    bankTransactionController: BankTransactionController;
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
        await workspaceAuthorizationMiddleware(request as any, reply, prisma);
      });

      // Register bank connection routes
      await bankConnectionRoutes(
        instance,
        controllers.bankConnectionController,
      );

      // Register transaction sync routes
      await transactionSyncRoutes(
        instance,
        controllers.transactionSyncController,
      );

      // Register bank transaction routes
      await bankTransactionRoutes(
        instance,
        controllers.bankTransactionController,
      );
    },
    { prefix: "/api/v1" },
  );
}

// Re-export individual route functions for testing
export { bankConnectionRoutes } from "./bank-connection.routes";
export { transactionSyncRoutes } from "./transaction-sync.routes";
export { bankTransactionRoutes } from "./bank-transaction.routes";
