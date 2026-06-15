import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { auditLogRoutes } from './audit-log.routes';
import { AuditLogController } from '../controllers/audit-log.controller';

export async function registerAuditComplianceRoutes(
  fastify: FastifyInstance,
  controllers: { auditLogController: AuditLogController },
  prisma: PrismaClient
) {
  await fastify.register(
    async (instance) => {
      // Register audit log routes
      await auditLogRoutes(instance, controllers.auditLogController, prisma);
    },
    { prefix: '/api/v1' }
  );
}

export { auditLogRoutes };
