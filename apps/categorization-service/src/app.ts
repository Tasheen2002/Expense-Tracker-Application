import Fastify, { FastifyInstance } from 'fastify';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { correlationPlugin, internalAuthPlugin } from '@expense-tracker/correlation';
import { PrismaClient } from '@prisma/client';
import { createCompositionRoot, CompositionRoot } from './composition-root';
import { registerCategorizationRulesRoutes } from './modules/categorization-rules/infrastructure/http/routes';

export interface CategorizationAppOptions {
  enableInternalAuth?: boolean;
  logger?: boolean;
  prismaFactory?: () => PrismaClient;
  compositionRootFactory?: (prisma: PrismaClient) => CompositionRoot;
}

declare module 'fastify' { interface FastifyInstance { compositionRoot: CompositionRoot; } }

/**
 * Factory to construct and configure the Categorization Service Fastify application.
 */
export async function buildCategorizationApp(options?: CategorizationAppOptions): Promise<FastifyInstance> {
  if (process.env.NODE_ENV === 'production') {
    if (options?.enableInternalAuth === false) throw new Error('Internal authentication cannot be disabled in production');
    if (!process.env.INTERNAL_API_KEY?.trim()) throw new Error('INTERNAL_API_KEY is required');
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
  await fastify.register(dbPlugin, { prismaFactory: options?.prismaFactory });
  await fastify.register(authPlugin);
  await fastify.register(errorPlugin);

  const compositionRoot = (options?.compositionRootFactory ?? createCompositionRoot)(fastify.prisma);
  fastify.decorate('compositionRoot', compositionRoot);

  // 5. Register module routes
  await registerCategorizationRulesRoutes(
    fastify,
    compositionRoot.categorizationRules
  );

  // 6. Deep Health Check (Postgres ping)
  fastify.get('/health', async (_request, reply) => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'categorization-service',
        uptime: process.uptime(),
        database: 'connected',
      };
    } catch (error: unknown) {
      fastify.log.error(error, 'Database health check failed');
      return reply.code(503).send({
        status: 'degraded',
        service: 'categorization-service',
        uptime: process.uptime(),
        database: 'disconnected',
        error: 'Database service unavailable',
      });
    }
  });

  return fastify;
  } catch (error) {
    await fastify.close().catch(closeError => fastify.log.error(closeError, 'Startup cleanup failed'));
    throw error;
  }
}

/**
 * Backward-compatible helper for tests
 */
export async function createServer(): Promise<FastifyInstance> {
  return buildCategorizationApp({ enableInternalAuth: false, logger: false });
}
