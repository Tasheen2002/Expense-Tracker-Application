import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { auditLogRoutes } from "./audit-log.routes";
import { AuditService } from "../../../application/services/audit.service";
import { workspaceAuthorizationMiddleware } from "../../../../../apps/api/src/shared/middleware";

export async function registerAuditComplianceRoutes(
  fastify: FastifyInstance,
  auditService: AuditService,
  prisma: PrismaClient,
) {
  await fastify.register(
    async (instance) => {
      // Add authentication hook first
      instance.addHook("onRequest", async (request, reply) => {
        await fastify.authenticate(request);
      });

      // Add workspace authorization middleware
      instance.addHook("preHandler", async (request, reply) => {
        await workspaceAuthorizationMiddleware(request as any, reply, prisma);
      });

      // Register audit log routes
      await instance.register(
        async (auditInstance) => {
          await auditLogRoutes(auditInstance, { auditService });
        },
        { prefix: "/audit-logs" },
      );
    },
    { prefix: "/api/v1/workspaces/:workspaceId" },
  );
}

export { auditLogRoutes };
