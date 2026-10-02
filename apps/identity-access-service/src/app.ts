import Fastify, { FastifyInstance } from 'fastify';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import rateLimit from '@fastify/rate-limit';
import { correlationPlugin, internalAuthPlugin } from '@expense-tracker/correlation';
import { PrismaClient } from './shared/infrastructure/persistence/prisma.client';
import { createCompositionRoot, CompositionRoot } from './composition-root';
import { registerIdentityWorkspaceRoutes } from './modules/identity-workspace/infrastructure/http/routes/index';

export interface IdentityAppOptions {
  /** App owns the client; callback drains background work before disconnect. */
  beforeDatabaseDisconnect?: () => Promise<void>;
  enableInternalAuth?: boolean;
  logger?: boolean;
  prisma?: PrismaClient;
  compositionRootFactory?: (prisma: PrismaClient) => CompositionRoot;
}

/**
 * Factory to construct and configure the Identity Access Service Fastify application.
 */
export async function buildIdentityApp(options?: IdentityAppOptions): Promise<FastifyInstance> {
  if (process.env.NODE_ENV === 'production') {
    if (options?.enableInternalAuth === false) throw new Error('Internal authentication cannot be disabled in production');
    if (!process.env.INTERNAL_API_KEY?.trim()) throw new Error('INTERNAL_API_KEY is required in production');
  }
  const isTest = process.env.NODE_ENV === 'test';
  const fastify = Fastify({
    logger: options?.logger !== undefined ? options.logger : (isTest ? false : { level: 'info' }),
  });

  try {

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
    await fastify.register(dbPlugin, { prisma: options?.prisma, beforeDatabaseDisconnect: options?.beforeDatabaseDisconnect });

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

    // 7. Deep Health Check (Postgres ping and service schema readiness)
    fastify.get('/health', async (_request, reply) => {
      try {
        await fastify.prisma.$queryRaw`SELECT 1 FROM identity_workspace.user_account LIMIT 1`;
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
  } catch (error: unknown) {
    try { await fastify.close(); } catch (cleanupError: unknown) { fastify.log.error({ err: cleanupError }, 'App construction cleanup failed'); }
    throw error;
  }
}

/**
 * Backward-compatible helper for existing tests
 */
export async function createServer(): Promise<FastifyInstance> {
  return buildIdentityApp({ enableInternalAuth: false, logger: false });
}
