import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import errorPlugin from './plugins/error';
import { container } from './container';
import { registerIdentityWorkspaceRoutes } from './modules/identity-workspace/infrastructure/http/routes/index';

/**
 * Creates and configures a Fastify server for the Identity Access Service.
 * Does NOT start listening — used by both `index.ts` and integration tests.
 */
export async function createServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : { level: 'info' },
  });

  fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  await fastify.register(dbPlugin);
  await fastify.register(authPlugin);
  await fastify.register(errorPlugin);

  container.register(fastify.prisma);

  const identityServices = container.getIdentityWorkspaceServices();
  await registerIdentityWorkspaceRoutes(
    fastify as any,
    identityServices,
    identityServices.prisma
  );

  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'identity-access-service',
    uptime: process.uptime(),
  }));

  return fastify;
}
