import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { bankConnectionRoutes } from './bank-connection.routes';
import { transactionSyncRoutes } from './transaction-sync.routes';
import { bankTransactionRoutes } from './bank-transaction.routes';
import { workspaceAuthorizationMiddleware } from '../../../../../apps/api/src/shared/middleware/index';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';

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
  prisma: PrismaClient
) {
  // Wrap in an async plugin function
  await fastify.register(
    async function bankFeedSyncRoutesPlugin(scopes: FastifyInstance) {
      // Authentication hook
      scopes.addHook('onRequest', async (request) => {
        await scopes.authenticate(request);
      });

      // Workspace authorization hook
      scopes.addHook('preHandler', async (request, reply) => {
        await workspaceAuthorizationMiddleware(
          request as AuthenticatedRequest,
          reply,
          prisma
        );
      });

      // Register feature-specific routes
      await bankConnectionRoutes(scopes, services.bankConnectionController);
      await transactionSyncRoutes(scopes, services.transactionSyncController);
      await bankTransactionRoutes(scopes, services.bankTransactionController);
    },
    { prefix: '/api/v1' }
  );
}

