import Fastify, { FastifyInstance } from 'fastify';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { correlationPlugin, internalAuthPlugin } from '@expense-tracker/correlation';
import { container } from './container';
import { registerBankFeedSyncRoutes } from './modules/bank-feed-sync/infrastructure/http/routes';

export interface BankFeedAppOptions {
  enableInternalAuth?: boolean;
  logger?: boolean;
}

/**
 * Factory to construct and configure the Bank Feed Sync Service Fastify application.
 */
export async function buildBankFeedApp(options?: BankFeedAppOptions): Promise<FastifyInstance> {
  const isTest = process.env.NODE_ENV === 'test';
  const fastify = Fastify({
    logger: options?.logger !== undefined ? options.logger : (isTest ? false : true),
  });

  // 1. Correlation ID plugin
  await fastify.register(correlationPlugin);

  // 2. Service-to-service internal authentication
  if (options?.enableInternalAuth !== false) {
    await fastify.register(internalAuthPlugin);
  }

  // 3. Security, database, auth, and error plugins
  await fastify.register(securityPlugin);
  await fastify.register(dbPlugin);
  await fastify.register(authPlugin);
  await fastify.register(errorPlugin);

  // 4. Initialize DI container
  container.register(fastify.prisma);

  // 5. Register module routes
  const bankFeedServices = container.getBankFeedServices();
  await registerBankFeedSyncRoutes(fastify as any, bankFeedServices, bankFeedServices.prisma);

  // 6. Deep Health Check (Postgres ping)
  fastify.get('/health', async (_request, reply) => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'bank-feed-service',
        uptime: process.uptime(),
        database: 'connected',
      };
    } catch (error: any) {
      return reply.code(503).send({
        status: 'degraded',
        service: 'bank-feed-service',
        uptime: process.uptime(),
        database: 'disconnected',
        error: error.message,
      });
    }
  });

  return fastify;
}

/**
 * Backward-compatible helper for tests
 */
export async function createServer(): Promise<FastifyInstance> {
  return buildBankFeedApp({ enableInternalAuth: false, logger: false });
}
