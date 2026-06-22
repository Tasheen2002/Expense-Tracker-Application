import Fastify, { FastifyInstance } from 'fastify';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { container } from './container';
import { registerApprovalWorkflowRoutes } from './modules/approval-workflow/infrastructure/http/routes';
import { registerPolicyControlsRoutes } from './modules/policy-controls/infrastructure/http/routes';

/**
 * Creates and configures a Fastify server for the Approval Policy Service.
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

  container.register(fastify.prisma);

  const approvalWorkflowServices = container.getApprovalWorkflowServices();
  await registerApprovalWorkflowRoutes(fastify as any, approvalWorkflowServices, approvalWorkflowServices.prisma);

  const policyControlsServices = container.getPolicyControlsServices();
  await registerPolicyControlsRoutes(fastify as any, policyControlsServices);

  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'approval-policy-service',
    uptime: process.uptime(),
  }));

  return fastify;
}
