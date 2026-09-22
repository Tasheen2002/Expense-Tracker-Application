import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { bankConnectionRoutes } from './bank-connection.routes';
import { transactionSyncRoutes } from './transaction-sync.routes';
import { bankTransactionRoutes } from './bank-transaction.routes';

/**
 * Register all Bank Feed Sync routes at the module boundary
 */
export async function registerBankFeedSyncRoutes(
  fastify: FastifyInstance,
  services: {
    bankConnectionController: any;
    transactionSyncController: any;
    bankTransactionController: any;
  },
  _prisma: PrismaClient
) {
  // Wrap in an async plugin function
  await fastify.register(
    async function bankFeedSyncRoutesPlugin(scopes: FastifyInstance) {
      // Register feature-specific routes
      await bankConnectionRoutes(scopes, services.bankConnectionController);
      await transactionSyncRoutes(scopes, services.transactionSyncController);
      await bankTransactionRoutes(scopes, services.bankTransactionController);
    },
    { prefix: '/api/v1' }
  );
}
