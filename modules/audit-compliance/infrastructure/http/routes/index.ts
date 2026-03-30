import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { auditLogRoutes } from './audit-log.routes';
import { AuditLogController } from '../controllers/audit-log.controller';
import { workspaceAuthorizationMiddleware } from '../../../../../apps/api/src/shared/middleware';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';

export async function registerAuditComplianceRoutes(
  fastify: FastifyInstance,
  controllers: { auditLogController: AuditLogController },
  prisma: PrismaClient
) {
  await fastify.register(
    async (instance) => {
      // Add authentication hook first
      instance.addHook('onRequest', async (request, reply) => {
        await fastify.authenticate(request);
      });

      // Add workspace authorization middleware
      instance.addHook('preHandler', async (request, reply) => {
        await workspaceAuthorizationMiddleware(
          request as AuthenticatedRequest,
          reply,
          prisma
        );
      });

      // Register audit log routes
      await auditLogRoutes(instance, controllers.auditLogController);
    },
    { prefix: '/api/v1' }
  );
}

export { auditLogRoutes };
