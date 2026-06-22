import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { container } from './container';
import { registerNotificationDispatchRoutes } from './modules/notification-dispatch/infrastructure/http/routes';

/**
 * Creates and configures a Fastify server for the Notification Service.
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
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  container.register(fastify.prisma);

  const notificationServices = container.getNotificationServices();
  await registerNotificationDispatchRoutes(fastify as any, notificationServices, notificationServices.prisma);

  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'notification-service',
    uptime: process.uptime(),
  }));

  return fastify;
}
