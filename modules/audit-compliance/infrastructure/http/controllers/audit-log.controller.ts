import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { CreateAuditLogHandler } from '../../../application/commands/create-audit-log.command';
import { PurgeAuditLogsHandler } from '../../../application/commands/purge-audit-logs.command';
import { GetAuditLogHandler } from '../../../application/queries/get-audit-log.query';
import { ListAuditLogsHandler } from '../../../application/queries/list-audit-logs.query';
import { GetEntityAuditHistoryHandler } from '../../../application/queries/get-entity-audit-history.query';
import { GetAuditSummaryHandler } from '../../../application/queries/get-audit-summary.query';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

interface ListAuditLogsRequestQuery {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  limit?: string | number;
  offset?: string | number;
}

interface GetAuditLogParams {
  auditLogId: string;
}

interface EntityAuditHistoryQuery {
  entityType: string;
  entityId: string;
  limit?: string | number;
  offset?: string | number;
}

interface AuditSummaryQuery {
  startDate: string;
  endDate: string;
}

interface CreateAuditLogBody {
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface PurgeAuditLogsQuery {
  olderThanDays: string | number;
}

// Extend AuthenticatedRequest to include workspace context correctly
export interface WorkspaceAuthenticatedRequest extends AuthenticatedRequest {
  workspaceMembership: {
    workspaceId: string;
    role: string;
  };
}

export class AuditLogController {
  constructor(
    private readonly createAuditLogHandler: CreateAuditLogHandler,
    private readonly purgeAuditLogsHandler: PurgeAuditLogsHandler,
    private readonly getAuditLogHandler: GetAuditLogHandler,
    private readonly listAuditLogsHandler: ListAuditLogsHandler,
    private readonly getEntityAuditHistoryHandler: GetEntityAuditHistoryHandler,
    private readonly getAuditSummaryHandler: GetAuditSummaryHandler
  ) {}

  private validationError(reply: FastifyReply, message: string): FastifyReply {
    return reply.status(400).send({
      success: false,
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      message,
    });
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    );
  }

  /**
   * GET /api/workspaces/:workspaceId/audit-logs
   * List audit logs with optional filters
   */
  async listAuditLogs(
    request: WorkspaceAuthenticatedRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { workspaceId } = request.workspaceMembership;
      const query = request.query as ListAuditLogsRequestQuery;

      const limit = query.limit !== undefined ? Number(query.limit) : 50;
      const offset = query.offset !== undefined ? Number(query.offset) : 0;
      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;

      const result = await this.listAuditLogsHandler.handle({
        workspaceId,
        filters: {
          userId: query.userId,
          action: query.action,
          entityType: query.entityType,
          entityId: query.entityId,
          startDate,
          endDate,
        },
        limit,
        offset,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Audit logs retrieved successfully',
        result.data
          ? {
              items: result.data.items.map((log) => log.toJSON()),
              pagination: {
                total: result.data.total,
                limit: result.data.limit,
                offset: result.data.offset,
                hasMore: result.data.hasMore,
              },
            }
          : undefined
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  /**
   * GET /api/workspaces/:workspaceId/audit-logs/:auditLogId
   * Get a specific audit log by ID
   */
  async getAuditLog(
    request: WorkspaceAuthenticatedRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { workspaceId } = request.workspaceMembership;
      const { auditLogId } = request.params as GetAuditLogParams;

      if (!this.isUuid(auditLogId)) {
        return this.validationError(reply, 'Invalid auditLogId format');
      }

      const result = await this.getAuditLogHandler.handle({
        workspaceId,
        auditLogId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Audit log retrieved successfully',
        result.data?.toJSON()
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  /**
   * GET /api/workspaces/:workspaceId/audit-logs/entity-history
   * Get audit history for a specific entity
   */
  async getEntityAuditHistory(
    request: WorkspaceAuthenticatedRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { workspaceId } = request.workspaceMembership;
      const { entityType, entityId, limit, offset } =
        request.query as EntityAuditHistoryQuery;

      if (!entityType) {
        return this.validationError(reply, 'entityType is required');
      }

      if (!entityId) {
        return this.validationError(reply, 'entityId is required');
      }

      const result = await this.getEntityAuditHistoryHandler.handle({
        workspaceId,
        entityType,
        entityId,
        limit: limit !== undefined ? Number(limit) : 50,
        offset: offset !== undefined ? Number(offset) : 0,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Entity audit history retrieved successfully',
        result.data
          ? {
              items: result.data.items.map((log) => log.toJSON()),
              pagination: {
                total: result.data.total,
                limit: result.data.limit,
                offset: result.data.offset,
                hasMore: result.data.hasMore,
              },
            }
          : undefined
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  /**
   * GET /api/workspaces/:workspaceId/audit-logs/summary
   * Get audit summary statistics
   */
  async getAuditSummary(
    request: WorkspaceAuthenticatedRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { workspaceId } = request.workspaceMembership;
      const { startDate, endDate } = request.query as AuditSummaryQuery;

      if (!startDate || !endDate) {
        return this.validationError(
          reply,
          'startDate and endDate are required'
        );
      }

      const result = await this.getAuditSummaryHandler.handle({
        workspaceId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Audit summary retrieved successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  /**
   * POST /api/workspaces/:workspaceId/audit-logs
   * Create an audit log entry (for system/internal use)
   */
  async createAuditLog(
    request: WorkspaceAuthenticatedRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { workspaceId } = request.workspaceMembership;
      const { userId } = request.user;
      const body = request.body as CreateAuditLogBody;

      if (!body?.action) {
        return this.validationError(reply, 'action is required');
      }

      if (!body?.entityType) {
        return this.validationError(reply, 'entityType is required');
      }

      if (!body?.entityId) {
        return this.validationError(reply, 'entityId is required');
      }

      const result = await this.createAuditLogHandler.handle({
        data: {
          workspaceId,
          userId,
          action: body.action,
          entityType: body.entityType,
          entityId: body.entityId,
          details: body.details,
          metadata: body.metadata,
          ipAddress:
            (request.headers['x-forwarded-for'] as string) ||
            request.ip ||
            undefined,
          userAgent: request.headers['user-agent'] || undefined,
        },
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Audit log created successfully',
        undefined,
        201
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  /**
   * DELETE /api/workspaces/:workspaceId/audit-logs?olderThanDays=N
   * Purge audit logs older than N days (admin only, minimum 30 days)
   */
  async purgeAuditLogs(
    request: WorkspaceAuthenticatedRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { workspaceId } = request.workspaceMembership;
      const { olderThanDays } = request.query as PurgeAuditLogsQuery;

      const result = await this.purgeAuditLogsHandler.handle({
        workspaceId,
        olderThanDays: Number(olderThanDays),
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Audit logs purged successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
