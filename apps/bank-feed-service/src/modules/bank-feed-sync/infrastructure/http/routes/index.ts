import { FastifyInstance } from 'fastify';
import { CompositionRoot } from '../../../../../composition-root';
import { bankConnectionRoutes } from './bank-connection.routes';
import { transactionSyncRoutes } from './transaction-sync.routes';
import { bankTransactionRoutes } from './bank-transaction.routes';

/**
 * Register all Bank Feed Sync routes at the module boundary
 */
export async function registerBankFeedSyncRoutes(
  fastify: FastifyInstance,
  services: Pick<CompositionRoot,
    'bankConnectionController' | 'transactionSyncController' | 'bankTransactionController'>
) {
  // Wrap in an async plugin function
  await fastify.register(
    async function bankFeedSyncRoutesPlugin(scopes: FastifyInstance) {
      // Register feature-specific routes
      await scopes.register(async (feature) => bankConnectionRoutes(feature, services.bankConnectionController));
      await scopes.register(async (feature) => transactionSyncRoutes(feature, services.transactionSyncController));
      await scopes.register(async (feature) => bankTransactionRoutes(feature, services.bankTransactionController));
    },
    { prefix: '/api/v1' }
  );
}
