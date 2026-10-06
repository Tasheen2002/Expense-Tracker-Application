import Fastify, { FastifyInstance } from 'fastify';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { correlationPlugin, internalAuthPlugin } from '@expense-tracker/correlation';
import type { PrismaClient } from '@prisma/client';
import { createCompositionRoot } from './composition-root';
import { registerAuditComplianceRoutes } from './modules/audit-compliance/infrastructure/http/routes';

export interface AuditAppOptions {
  enableInternalAuth?: boolean;
  logger?: boolean;
  prisma?: PrismaClient;
}

/**
 * Factory to construct and configure the Audit Compliance Service Fastify application.
 */
export async function buildAuditComplianceApp(options?: AuditAppOptions): Promise<FastifyInstance> {
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
    await fastify.register(dbPlugin, { prisma: options?.prisma });
    await fastify.register(authPlugin);
    await fastify.register(errorPlugin);

    // 4. Construct dependencies for this app and register its routes.
    const root = createCompositionRoot(fastify.prisma);
    await registerAuditComplianceRoutes(fastify, root);

    // 7. Deep Health Check (Postgres ping)
    fastify.get('/health', async (_request, reply) => {
      try {
        await fastify.prisma.$queryRaw`SELECT a.id, account.id FROM audit_compliance.audit_logs a,
          audit_compliance.account_audit_logs account LIMIT 0`;
        return {
          status: 'ok',
          service: 'audit-compliance-service',
          uptime: process.uptime(),
          database: 'connected',
        };
      } catch (error: unknown) {
        fastify.log.error({ err: error }, 'Audit database health check failed');
        return reply.code(503).send({
          status: 'degraded',
          service: 'audit-compliance-service',
          uptime: process.uptime(),
          database: 'disconnected',
          error: process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message : 'Database service unavailable',
        });
      }
    });

    return fastify;
  } catch (error: unknown) {
    try { await fastify.close(); } catch (cleanupError: unknown) { fastify.log.error({ err: cleanupError }, 'App construction cleanup failed'); }
    throw error;
  }
}
