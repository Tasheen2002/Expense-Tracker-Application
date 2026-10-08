import { verifyDatabaseReadiness } from './shared/infrastructure/persistence/database-readiness';
import { PrismaClient } from './prisma-client';
import Fastify, { FastifyInstance } from 'fastify';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { correlationPlugin, internalAuthPlugin } from '@expense-tracker/correlation';
import { createCompositionRoot } from './composition-root';
import { registerBankFeedSyncRoutes } from './modules/bank-feed-sync/infrastructure/http/routes';
import { IBankAPIClient, IExpenseReferenceChecker } from './modules/bank-feed-sync/application/services/transaction-sync.service';

export interface BankFeedAppOptions {
  /** App owns the client; callback drains background work before disconnect. */
  beforeDatabaseDisconnect?: () => Promise<void>;
  enableInternalAuth?: boolean;
  logger?: boolean;
  prisma?: PrismaClient;
  bankAPIClient?: IBankAPIClient;
  expenseReferenceChecker?: IExpenseReferenceChecker;
}

/**
 * Factory to construct and configure the Bank Feed Sync Service Fastify application.
 */
export async function buildBankFeedApp(options?: BankFeedAppOptions): Promise<FastifyInstance> {
  if (process.env.NODE_ENV === 'production') {
    if (options?.enableInternalAuth === false) throw new Error('Internal authentication cannot be disabled in production');
    if (!process.env.INTERNAL_API_KEY?.trim()) throw new Error('INTERNAL_API_KEY is required in production');
  }
  const isTest = process.env.NODE_ENV === 'test';
  const fastify = Fastify({
    logger: options?.logger !== undefined ? options.logger : (isTest ? false : true),
  });

  try {

    // 1. Correlation ID plugin
    await fastify.register(correlationPlugin);

    // 2. Service-to-service internal authentication
    if (options?.enableInternalAuth !== false) {
      await fastify.register(internalAuthPlugin);
    }

    // 3. Security, database, auth, and error plugins
    await fastify.register(securityPlugin);
    await fastify.register(dbPlugin, { prisma: options?.prisma, beforeDatabaseDisconnect: options?.beforeDatabaseDisconnect });
    await fastify.register(authPlugin);
    await fastify.register(errorPlugin);

    // 4. Build one dependency graph for this app instance.
    const compositionRoot = createCompositionRoot(fastify.prisma, {
      bankAPIClient: options?.bankAPIClient,
      expenseReferenceChecker: options?.expenseReferenceChecker,
    });
    fastify.decorate('compositionRoot', compositionRoot);

    // 5. Register module routes
    await registerBankFeedSyncRoutes(fastify, compositionRoot);

    // 6. Deep Health Check (Postgres ping)
    fastify.get('/health', async (_request, reply) => {
      try {
        await verifyDatabaseReadiness(fastify.prisma);
        return {
          status: 'ok',
          service: 'bank-feed-service',
          uptime: process.uptime(),
          database: 'connected',
        };
      } catch (error: unknown) {
        fastify.log.error(error, 'Health check database ping failed');
        return reply.code(503).send({
          status: 'degraded',
          service: 'bank-feed-service',
          uptime: process.uptime(),
          database: 'disconnected',
        });
      }
    });

    return fastify;
  } catch (error: unknown) {
    try { await fastify.close(); } catch (cleanupError: unknown) { fastify.log.error({ err: cleanupError }, 'App construction cleanup failed'); }
    throw error;
  }
}

/**
 * Backward-compatible helper for tests
 */
export async function createServer(
  bankAPIClient?: IBankAPIClient,
  expenseReferenceChecker?: IExpenseReferenceChecker
): Promise<FastifyInstance> {
  return buildBankFeedApp({ enableInternalAuth: false, logger: false, bankAPIClient, expenseReferenceChecker });
}
