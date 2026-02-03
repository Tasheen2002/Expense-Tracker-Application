import { FastifyInstance } from "fastify";
import { AuditLogController } from "../controllers/audit-log.controller";
import { AuditService } from "../../../application/services/audit.service";

export async function auditLogRoutes(
  fastify: FastifyInstance,
  options: { auditService: AuditService },
): Promise<void> {
  const controller = new AuditLogController(options.auditService);

  // GET /api/workspaces/:workspaceId/audit-logs/summary
  // Must be defined before /:auditLogId to avoid route conflict
  fastify.get("/summary", async (request, reply) => {
    return controller.getAuditSummary(request as any, reply);
  });

  // GET /api/workspaces/:workspaceId/audit-logs/entity-history
  fastify.get("/entity-history", async (request, reply) => {
    return controller.getEntityAuditHistory(request as any, reply);
  });

  // GET /api/workspaces/:workspaceId/audit-logs
  fastify.get("/", async (request, reply) => {
    return controller.listAuditLogs(request as any, reply);
  });

  // GET /api/workspaces/:workspaceId/audit-logs/:auditLogId
  fastify.get("/:auditLogId", async (request, reply) => {
    return controller.getAuditLog(request as any, reply);
  });

  // POST /api/workspaces/:workspaceId/audit-logs
  fastify.post("/", async (request, reply) => {
    return controller.createAuditLog(request as any, reply);
  });
}
