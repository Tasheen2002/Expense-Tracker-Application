import Fastify, { FastifyInstance } from 'fastify';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { correlationPlugin, internalAuthPlugin } from '@expense-tracker/correlation';
import { PrismaClient } from './prisma-client';
import { createCompositionRoot, CompositionRoot } from './composition-root';
import { registerNotificationDispatchRoutes } from './modules/notification-dispatch/infrastructure/http/routes';
import { verifyDatabaseReadiness } from './shared/infrastructure/persistence/database-readiness';

export interface NotificationAppOptions {
  enableInternalAuth?: boolean;
  logger?: boolean;
  /** The app owns this client's shutdown, including an injected client. */
  prisma?: PrismaClient;
  compositionRootFactory?: (prisma: PrismaClient) => CompositionRoot;
}

declare module 'fastify' {
  interface FastifyInstance { compositionRoot: CompositionRoot; }
}

export async function buildNotificationApp(options: NotificationAppOptions = {}): Promise<FastifyInstance> {
  if (process.env.NODE_ENV === 'production') {
    if (options.enableInternalAuth === false) throw new Error('Internal authentication cannot be disabled in production');
    if (!process.env.INTERNAL_API_KEY?.trim()) throw new Error('INTERNAL_API_KEY is required in production');
  }
  const fastify = Fastify({ logger: options.logger ?? (process.env.NODE_ENV === 'test' ? false : { level: 'info' }) });
  let root: CompositionRoot | undefined;
  try {
    await fastify.register(errorPlugin);
    await fastify.register(correlationPlugin);
    if (options.enableInternalAuth !== false) await fastify.register(internalAuthPlugin);
    await fastify.register(securityPlugin);
    await fastify.register(dbPlugin, { prisma: options.prisma });
    fastify.addHook('onClose', async () => {
      const results = await Promise.allSettled([
        Promise.resolve().then(() => root?.workers.outbox.stop()),
        Promise.resolve().then(() => root?.workers.email?.stop()),
      ]);
      await fastify.prisma.$disconnect();
      const failed = results.find(result => result.status === 'rejected');
      if (failed?.status === 'rejected') throw failed.reason;
    });
    await fastify.register(authPlugin);
    root = options.compositionRootFactory
      ? options.compositionRootFactory(fastify.prisma)
      : createCompositionRoot(fastify.prisma, { onWorkerError: error => fastify.log.error({ err: error }, 'Email batch interrupted') });
    fastify.decorate('compositionRoot', root);
    await registerNotificationDispatchRoutes(fastify, root.controllers, fastify.prisma, root.accountNotificationService);
    fastify.get('/health', async (_request, reply) => {
      try {
        await verifyDatabaseReadiness(fastify.prisma);
        return { status: 'ok', service: 'notification-service', uptime: process.uptime(), database: 'connected',
          emailDelivery: root?.workers.email ? 'configured' : 'paused' };
      } catch (error: unknown) {
        fastify.log.error({ err: error }, 'Database readiness check failed');
        return reply.code(503).send({ status: 'degraded', service: 'notification-service',
          uptime: process.uptime(), database: 'unavailable', error: 'Database service unavailable' });
      }
    });
    return fastify;
  } catch (error: unknown) {
    try { await fastify.close(); } catch (cleanupError: unknown) { fastify.log.error({ err: cleanupError }, 'Startup cleanup failed'); }
    throw error;
  }
}

export async function createServer(): Promise<FastifyInstance> {
  return buildNotificationApp({ enableInternalAuth: false, logger: false });
}
