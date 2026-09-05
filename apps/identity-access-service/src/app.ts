import Fastify, { FastifyInstance } from 'fastify';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import rateLimit from '@fastify/rate-limit';
import { correlationPlugin, internalAuthPlugin } from '@expense-tracker/correlation';
import { PrismaClient } from '@prisma/client';
import { createCompositionRoot, CompositionRoot } from './composition-root';
import { registerIdentityWorkspaceRoutes } from './modules/identity-workspace/infrastructure/http/routes/index';

export interface IdentityAppOptions {
  enableInternalAuth?: boolean;
  logger?: boolean;
  compositionRootFactory?: (prisma: PrismaClient) => CompositionRoot;
}

/**
 * Factory to construct and configure the Identity Access Service Fastify application.
 */
export async function buildIdentityApp(options?: IdentityAppOptions): Promise<FastifyInstance> {
  const isTest = process.env.NODE_ENV === 'test';
  const fastify = Fastify({
    logger: options?.logger !== undefined ? options.logger : (isTest ? false : true),
  });

  // 1. Correlation ID plugin
  await fastify.register(correlationPlugin);

  // 2. Service-to-service internal authentication (can be disabled for unit tests)
  if (options?.enableInternalAuth !== false) {
    await fastify.register(internalAuthPlugin);
  }

  // 3. Security, rate-limit, and database plugins
  await fastify.register(securityPlugin);
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });
  await fastify.register(dbPlugin);

  // 4. Initialize typed Composition Root using the injected or default factory
  const rootFactory = options?.compositionRootFactory ?? createCompositionRoot;
  const root = rootFactory(fastify.prisma);

  // 5. Auth (with injected SessionService) and error plugins
  await fastify.register(authPlugin, {
    sessionService: root.sessionService,
  });
  await fastify.register(errorPlugin);

  // 6. Register routes
  await registerIdentityWorkspaceRoutes(
    fastify,
    root.controllers
  );

  // 7. Deep Health Check (Postgres ping)
  fastify.get('/health', async (_request, reply) => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'identity-access-service',
        uptime: process.uptime(),
        database: 'connected',
      };
    } catch (error: unknown) {
      fastify.log.error(error, 'Health check database ping failed');
      const isDev = process.env.NODE_ENV === 'development';
      const errMsg = isDev && error instanceof Error ? error.message : 'Database service unavailable';
      return reply.code(503).send({
        status: 'degraded',
        service: 'identity-access-service',
        uptime: process.uptime(),
        database: 'disconnected',
        error: errMsg,
      });
    }
  });

  return fastify;
}

/**
 * Backward-compatible helper for existing tests
 */
export async function createServer(): Promise<FastifyInstance> {
  return buildIdentityApp({ enableInternalAuth: false, logger: false });
}
