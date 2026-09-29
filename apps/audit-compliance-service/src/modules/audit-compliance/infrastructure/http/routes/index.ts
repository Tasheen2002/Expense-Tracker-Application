import { FastifyInstance } from 'fastify';
import type { AuditCompositionRoot } from '../../../../../composition-root';
import { auditLogRoutes } from './audit-log.routes';
import { registerAuditOutboxEventRoutes } from './outbox-event.routes';

export async function registerAuditComplianceRoutes(
  fastify: FastifyInstance,
  root: AuditCompositionRoot
) {
  await fastify.register(
    async (instance) => {
      // Register audit log routes
      await auditLogRoutes(instance, root.auditLogController);
      // Register outbox webhook event consumer
      await registerAuditOutboxEventRoutes(instance, root.auditService);
    },
    { prefix: '/api/v1' }
  );
}

export { auditLogRoutes };
