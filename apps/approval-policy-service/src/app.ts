import Fastify, { FastifyInstance } from 'fastify';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { correlationPlugin, internalAuthPlugin } from '@expense-tracker/correlation';
import { container } from './container';
import { registerApprovalWorkflowRoutes } from './modules/approval-workflow/infrastructure/http/routes';
import { registerPolicyControlsRoutes } from './modules/policy-controls/infrastructure/http/routes';

export interface ApprovalAppOptions {
  enableInternalAuth?: boolean;
  logger?: boolean;
}

/**
 * Factory to construct and configure the Approval Policy Service Fastify application.
 */
export async function buildApprovalApp(options?: ApprovalAppOptions): Promise<FastifyInstance> {
  const isTest = process.env.NODE_ENV === 'test';
  const fastify = Fastify({
    logger: options?.logger !== undefined ? options.logger : (isTest ? false : { level: 'info' }),
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

  // 4. Initialize DI container
  container.register(fastify.prisma);

  // 5. Register module routes
  const approvalWorkflowServices = container.getApprovalWorkflowServices();
  await registerApprovalWorkflowRoutes(fastify as any, approvalWorkflowServices, approvalWorkflowServices.prisma);

  const policyControlsServices = container.getPolicyControlsServices();
  await registerPolicyControlsRoutes(fastify as any, policyControlsServices);

  // 6. Deep Health Check (Postgres ping)
  fastify.get('/health', async (_request, reply) => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'approval-policy-service',
        uptime: process.uptime(),
        database: 'connected',
      };
    } catch (error: any) {
      return reply.code(503).send({
        status: 'degraded',
        service: 'approval-policy-service',
        uptime: process.uptime(),
        database: 'disconnected',
        error: error.message,
      });
    }
  });

  return fastify;
}

/**
 * Backward-compatible helper for existing tests
 */
export async function createServer(): Promise<FastifyInstance> {
  return buildApprovalApp({ enableInternalAuth: false, logger: false });
}
