import Fastify, { FastifyInstance } from 'fastify';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { correlationPlugin, internalAuthPlugin } from '@expense-tracker/correlation';
import { createCompositionRoot, CompositionRootOptions } from './composition-root';
import { registerApprovalWorkflowRoutes } from './modules/approval-workflow/infrastructure/http/routes';
import { registerPolicyControlsRoutes } from './modules/policy-controls/infrastructure/http/routes';
import rateLimit from '@fastify/rate-limit';

import { PrismaClient } from './shared/infrastructure/persistence/prisma.client';

export interface ApprovalAppOptions {
  /** App owns the client; callback drains background work before disconnect. */
  beforeDatabaseDisconnect?: () => Promise<void>;
  enableInternalAuth?: boolean;
  logger?: boolean;
  prisma?: PrismaClient;
  compositionRootOptions?: CompositionRootOptions;
}

/**
 * Factory to construct and configure the Approval Policy Service Fastify application.
 */
export async function buildApprovalApp(options?: ApprovalAppOptions): Promise<FastifyInstance> {
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

    // 2. Service-to-service internal authentication
    if (options?.enableInternalAuth !== false) {
      await fastify.register(internalAuthPlugin);
    }

    // 3. Security, rate-limit, database, auth, and error plugins
    await fastify.register(securityPlugin);
    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });
    await fastify.register(dbPlugin, { prisma: options?.prisma, beforeDatabaseDisconnect: options?.beforeDatabaseDisconnect });
    await fastify.register(authPlugin);
    await fastify.register(errorPlugin);

    // 4. Pure typed Composition Root
    const compositionRoot = createCompositionRoot(fastify.prisma, options?.compositionRootOptions);
    fastify.decorate('compositionRoot', compositionRoot);

    // 5. Register module routes
    await registerApprovalWorkflowRoutes(
      fastify,
      compositionRoot.approvalWorkflow
    );

    await registerPolicyControlsRoutes(
      fastify,
      compositionRoot.policyControls
    );

    // 6. Deep Health Check (Postgres ping and service schema readiness)
    fastify.get('/health', async (_request, reply) => {
      try {
        await fastify.prisma.$queryRaw`SELECT 1 FROM approval_workflow.approval_chains LIMIT 1`;
        return {
          status: 'ok',
          service: 'approval-policy-service',
          uptime: process.uptime(),
          database: 'connected',
        };
      } catch (error: unknown) {
        fastify.log.error(error, 'Health check database ping failed');
        const isDev = process.env.NODE_ENV === 'development';
        const errMsg = isDev && error instanceof Error ? error.message : 'Database service unavailable';
        return reply.code(503).send({
          status: 'degraded',
          service: 'approval-policy-service',
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
export async function createServer(options?: ApprovalAppOptions): Promise<FastifyInstance> {
  return buildApprovalApp({ enableInternalAuth: false, logger: false, ...options });
}
