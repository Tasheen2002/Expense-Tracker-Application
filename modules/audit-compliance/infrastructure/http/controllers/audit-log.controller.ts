import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { AuditService } from "../../../application/services/audit.service";
import { AuditLog } from "../../../domain/entities/audit-log.entity";
import {
  listAuditLogsQuerySchema,
  getAuditLogParamsSchema,
  entityAuditHistoryQuerySchema,
  auditSummaryQuerySchema,
  createAuditLogBodySchema,
} from "../validation/audit-log.schema";

// Extend AuthenticatedRequest to include workspace context
interface WorkspaceAuthenticatedRequest extends AuthenticatedRequest {
  workspace: {
    workspaceId: string;
    role: string;
  };
}

// Helper to convert AuditLog entity to response format
function toResponse(auditLog: AuditLog) {
  return {
    id: auditLog.id.getValue(),
    workspaceId: auditLog.workspaceId,
    userId: auditLog.userId,
    action: auditLog.action.getValue(),
    entityType: auditLog.resource.entityType,
    entityId: auditLog.resource.entityId,
    details: auditLog.details,
    metadata: auditLog.metadata,
    ipAddress: auditLog.ipAddress,
    userAgent: auditLog.userAgent,
    createdAt: auditLog.createdAt,
  };
}

export class AuditLogController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /api/workspaces/:workspaceId/audit-logs
   * List audit logs with optional filters
   */
  async listAuditLogs(
    request: WorkspaceAuthenticatedRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { workspaceId } = request.workspace;
    const queryResult = listAuditLogsQuerySchema.safeParse(request.query);

    if (!queryResult.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid query parameters",
        details: queryResult.error.errors,
      });
    }

    const query = queryResult.data;

    const result = await this.auditService.listAuditLogs(
      workspaceId,
      {
        userId: query.userId,
        action: query.action,
        entityType: query.entityType,
        entityId: query.entityId,
        startDate: query.startDate,
        endDate: query.endDate,
      },
      query.limit,
      query.offset,
    );

    return reply.status(200).send({
      success: true,
      statusCode: 200,
      message: "Audit logs retrieved successfully",
      data: {
        items: result.items.map(toResponse),
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      },
    });
  }

  /**
   * GET /api/workspaces/:workspaceId/audit-logs/:auditLogId
   * Get a specific audit log by ID
   */
  async getAuditLog(
    request: WorkspaceAuthenticatedRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { workspaceId } = request.workspace;
    const paramsResult = getAuditLogParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid audit log ID",
        details: paramsResult.error.errors,
      });
    }

    const { auditLogId } = paramsResult.data;
    const auditLog = await this.auditService.getAuditLogById(
      workspaceId,
      auditLogId,
    );

    if (!auditLog) {
      return reply.status(404).send({
        error: "AUDIT_LOG_NOT_FOUND",
        message: "Audit log not found",
      });
    }

    return reply.status(200).send(toResponse(auditLog));
  }

  /**
   * GET /api/workspaces/:workspaceId/audit-logs/entity-history
   * Get audit history for a specific entity
   */
  async getEntityAuditHistory(
    request: WorkspaceAuthenticatedRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { workspaceId } = request.workspace;
    const queryResult = entityAuditHistoryQuerySchema.safeParse(request.query);

    if (!queryResult.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid query parameters",
        details: queryResult.error.errors,
      });
    }

    const { entityType, entityId, limit, offset } = queryResult.data;

    const result = await this.auditService.getEntityAuditHistory(
      workspaceId,
      entityType,
      entityId,
      { limit, offset },
    );

    return reply.status(200).send({
      success: true,
      statusCode: 200,
      message: "Entity audit history retrieved successfully",
      data: {
        items: result.items.map(toResponse),
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      },
    });
  }

  /**
   * GET /api/workspaces/:workspaceId/audit-logs/summary
   * Get audit summary statistics
   */
  async getAuditSummary(
    request: WorkspaceAuthenticatedRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { workspaceId } = request.workspace;
    const queryResult = auditSummaryQuerySchema.safeParse(request.query);

    if (!queryResult.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message:
          "Invalid query parameters. startDate and endDate are required.",
        details: queryResult.error.errors,
      });
    }

    const { startDate, endDate } = queryResult.data;

    const summary = await this.auditService.getAuditSummary(
      workspaceId,
      startDate,
      endDate,
    );

    return reply.status(200).send(summary);
  }

  /**
   * POST /api/workspaces/:workspaceId/audit-logs
   * Create an audit log entry (for system/internal use)
   */
  async createAuditLog(
    request: WorkspaceAuthenticatedRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const { workspaceId } = request.workspace;
    const { userId } = request.user;
    const bodyResult = createAuditLogBodySchema.safeParse(request.body);

    if (!bodyResult.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid request body",
        details: bodyResult.error.errors,
      });
    }

    const body = bodyResult.data;

    const auditLog = await this.auditService.createAuditLog({
      workspaceId,
      userId,
      action: body.action,
      entityType: body.entityType,
      entityId: body.entityId,
      details: body.details,
      metadata: body.metadata,
      ipAddress:
        (request.headers["x-forwarded-for"] as string) ||
        request.ip ||
        undefined,
      userAgent: request.headers["user-agent"] || undefined,
    });

    return reply.status(201).send(toResponse(auditLog));
  }
}
