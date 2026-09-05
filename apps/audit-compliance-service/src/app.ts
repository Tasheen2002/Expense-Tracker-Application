import Fastify, { FastifyInstance } from 'fastify';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { correlationPlugin, internalAuthPlugin } from '@expense-tracker/correlation';
import { container } from './container';
import { registerAuditComplianceRoutes } from './modules/audit-compliance/infrastructure/http/routes';

export interface AuditAppOptions {
  enableInternalAuth?: boolean;
  logger?: boolean;
}

/**
 * Factory to construct and configure the Audit Compliance Service Fastify application.
 */
export async function buildAuditComplianceApp(options?: AuditAppOptions): Promise<FastifyInstance> {
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

  // 5. Initialize DI container
  container.register(fastify.prisma);

  // 6. Register module routes
  const auditServices = container.getAuditServices();
  await registerAuditComplianceRoutes(
    fastify as any,
    auditServices,
    auditServices.prisma
  );

  // 7. Deep Health Check (Postgres ping)
  fastify.get('/health', async (_request, reply) => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'audit-compliance-service',
        uptime: process.uptime(),
        database: 'connected',
      };
    } catch (error: any) {
      return reply.code(503).send({
        status: 'degraded',
        service: 'audit-compliance-service',
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
  return buildAuditComplianceApp({ enableInternalAuth: false, logger: false });
}
