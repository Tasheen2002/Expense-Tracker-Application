import Fastify, { FastifyInstance } from 'fastify';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { container } from './container';
import { registerBankFeedSyncRoutes } from './modules/bank-feed-sync/infrastructure/http/routes';

/**
 * Creates and configures a Fastify server for the Bank Feed Service.
 * Does NOT start listening — used by both `index.ts` and integration tests.
 */
export async function createServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : { level: 'info' },
  });

  await fastify.register(securityPlugin);
  await fastify.register(dbPlugin);
  await fastify.register(authPlugin);
  await fastify.register(errorPlugin);

  container.register(fastify.prisma);

  const bankFeedServices = container.getBankFeedServices();
  await registerBankFeedSyncRoutes(fastify as any, bankFeedServices, bankFeedServices.prisma);

  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'bank-feed-service',
    uptime: process.uptime(),
  }));

  return fastify;
}
