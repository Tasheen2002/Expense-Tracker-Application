import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { CreateAuditLogHandler } from '../../../application/commands/create-audit-log.command';
import { PurgeAuditLogsHandler } from '../../../application/commands/purge-audit-logs.command';
import { GetAuditLogHandler } from '../../../application/queries/get-audit-log.query';
import { ListAuditLogsHandler } from '../../../application/queries/list-audit-logs.query';
import { GetEntityAuditHistoryHandler } from '../../../application/queries/get-entity-audit-history.query';
import { GetAuditSummaryHandler } from '../../../application/queries/get-audit-summary.query';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

export class AuditLogController {
  constructor(
    private readonly createAuditLogHandler: CreateAuditLogHandler,
    private readonly purgeAuditLogsHandler: PurgeAuditLogsHandler,
    private readonly getAuditLogHandler: GetAuditLogHandler,
    private readonly listAuditLogsHandler: ListAuditLogsHandler,
    private readonly getEntityAuditHistoryHandler: GetEntityAuditHistoryHandler,
    private readonly getAuditSummaryHandler: GetAuditSummaryHandler
  ) {}

  /**
   * GET /api/workspaces/:workspaceId/audit-logs
   * List audit logs with optional filters
   */
  async listAuditLogs(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: {
        userId?: string;
        action?: string;
        entityType?: string;
        entityId?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
        offset?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { workspaceId } = request.params;
      const query = request.query;

      const result = await this.listAuditLogsHandler.handle({
        workspaceId,
        filters: {
          userId: query.userId,
          action: query.action,
          entityType: query.entityType,
          entityId: query.entityId,
          startDate: query.startDate ? new Date(query.startDate) : undefined,
          endDate: query.endDate ? new Date(query.endDate) : undefined,
        },
        limit: query.limit,
        offset: query.offset,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Audit logs retrieved successfully',
        result.data
          ? {
              items: result.data.items,
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
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; auditLogId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { workspaceId, auditLogId } = request.params;

      const result = await this.getAuditLogHandler.handle({
        workspaceId,
        auditLogId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Audit log retrieved successfully',
        result.data
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
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: {
        entityType: string;
        entityId: string;
        limit?: number;
        offset?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { workspaceId } = request.params;
      const { entityType, entityId, limit, offset } = request.query;

      const result = await this.getEntityAuditHistoryHandler.handle({
        workspaceId,
        entityType,
        entityId,
        limit,
        offset,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Entity audit history retrieved successfully',
        result.data
          ? {
              items: result.data.items,
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
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { startDate: string; endDate: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { workspaceId } = request.params;
      const { startDate, endDate } = request.query;

      const result = await this.getAuditSummaryHandler.handle({
        workspaceId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Audit summary retrieved successfully',
        result.data
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
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: {
        action: string;
        entityType: string;
        entityId: string;
        details?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { workspaceId } = request.params;
      const { userId } = request.user;
      const body = request.body;

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
        result.data ? { auditLogId: result.data } : undefined,
        201
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  /**
   * DELETE /api/workspaces/:workspaceId/audit-logs
   * Purge audit logs older than N days (admin only, minimum 30 days)
   */
  async purgeAuditLogs(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { olderThanDays: number };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { workspaceId } = request.params;
      const { olderThanDays } = request.query;

      const result = await this.purgeAuditLogsHandler.handle({
        workspaceId,
        olderThanDays,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Audit logs purged successfully',
        undefined,
        204
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
