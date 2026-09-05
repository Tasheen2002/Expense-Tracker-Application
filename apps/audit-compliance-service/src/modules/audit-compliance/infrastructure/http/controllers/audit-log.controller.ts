import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import {
  CreateAuditLogHandler,
  PurgeAuditLogsHandler,
  GetAuditLogHandler,
  ListAuditLogsHandler,
  GetEntityAuditHistoryHandler,
  GetAuditSummaryHandler,
} from '../../../application';
import { ResponseHelper } from '@shared/response.helper';
import {
  WorkspaceParams,
  ListAuditLogsQuery,
  AuditLogParams,
  EntityHistoryQuery,
  AuditSummaryQuery,
  CreateAuditLogBody,
  PurgeAuditLogsQuery,
} from '../validation/audit-log.schema';

export class AuditLogController {
  constructor(
    private readonly createAuditLogHandler: CreateAuditLogHandler,
    private readonly purgeAuditLogsHandler: PurgeAuditLogsHandler,
    private readonly getAuditLogHandler: GetAuditLogHandler,
    private readonly listAuditLogsHandler: ListAuditLogsHandler,
    private readonly getEntityAuditHistoryHandler: GetEntityAuditHistoryHandler,
    private readonly getAuditSummaryHandler: GetAuditSummaryHandler
  ) {}

  async listAuditLogs(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Querystring: ListAuditLogsQuery;
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
      return ResponseHelper.ok(reply, 'Audit logs retrieved successfully', {
        items: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      });
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getAuditLog(
    request: AuthenticatedRequest<{
      Params: AuditLogParams;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { workspaceId, auditLogId } = request.params;

      const auditLog = await this.getAuditLogHandler.handle({
        workspaceId,
        auditLogId,
      });

      return ResponseHelper.ok(reply, 'Audit log retrieved successfully', auditLog);
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getEntityAuditHistory(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Querystring: EntityHistoryQuery;
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
      return ResponseHelper.ok(reply, 'Entity audit history retrieved successfully', {
        items: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      });
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getAuditSummary(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Querystring: AuditSummaryQuery;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { workspaceId } = request.params;
      const { startDate, endDate } = request.query;

      const summary = await this.getAuditSummaryHandler.handle({
        workspaceId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      return ResponseHelper.ok(reply, 'Audit summary retrieved successfully', summary);
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async createAuditLog(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Body: CreateAuditLogBody;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { workspaceId } = request.params;
      const { userId } = request.user;
      const body = request.body;

      const result = await this.createAuditLogHandler.handle({
        workspaceId,
        userId,
        action: body.action,
        entityType: body.entityType,
        entityId: body.entityId,
        details: body.details ?? undefined,
        metadata: body.metadata ?? undefined,
        ipAddress:
          (request.headers['x-forwarded-for'] as string) ||
          request.ip ||
          undefined,
        userAgent: request.headers['user-agent'] || undefined,
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

  async purgeAuditLogs(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Querystring: PurgeAuditLogsQuery;
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
