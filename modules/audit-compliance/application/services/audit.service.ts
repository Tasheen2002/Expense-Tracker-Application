import { DomainEvent } from '../../../../apps/api/src/shared/domain/events';
import { AuditLog, AuditLogDTO } from '../../domain/entities/audit-log.entity';
import { AuditAction } from '../../domain/value-objects/audit-action.vo';
import { AuditResource } from '../../domain/value-objects/audit-resource.vo';
import { AuditLogId } from '../../domain/value-objects/audit-log-id.vo';
import {
  IAuditLogRepository,
  AuditLogFilter,
} from '../../domain/repositories/audit-log.repository';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';

export interface CreateAuditLogDTO {
  workspaceId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditSummary {
  totalLogs: number;
  actionBreakdown: { action: string; count: number }[];
  period: { startDate: Date; endDate: Date };
}

export interface ListAuditLogsFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class AuditService {
  private consecutiveFailures = 0;
  private static readonly FAILURE_ALERT_THRESHOLD = 5;

  constructor(private readonly auditRepository: IAuditLogRepository) {}

  async log(event: DomainEvent): Promise<void> {
    try {
      const payload = event.getPayload();
      const workspaceId = payload.workspaceId;

      // Skip logging system-level events without a workspaceId
      if (!workspaceId) {
        console.debug(
          `[AuditService] Skipping system-level event without workspaceId: ${event.eventType}`
        );
        return;
      }

      const userId = payload.triggeredBy || payload.userId || null;

      const action = AuditAction.create(event.eventType);
      const resource = AuditResource.create(
        event.aggregateType,
        event.aggregateId
      );

      const auditLog = AuditLog.create({
        workspaceId: String(workspaceId),
        userId: userId ? String(userId) : null,
        action: action,
        resource: resource,
        details: payload,
        metadata: {
          timestamp: event.occurredAt,
          eventId: event.eventId,
        },
        ipAddress: null,
        userAgent: null,
      });

      await this.auditRepository.save(auditLog);

      // Reset failure counter on success
      this.consecutiveFailures = 0;
    } catch (error) {
      this.consecutiveFailures++;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.error(
        `[AuditService] AUDIT_FAILURE: Failed to log event "${event.eventType}" ` +
          `(failure #${this.consecutiveFailures}): ${errorMessage}`
      );
    }
  }

  /**
   * Creates an audit log entry directly (for HTTP API usage).
   */
  async createAuditLog(data: CreateAuditLogDTO): Promise<AuditLog> {
    const action = AuditAction.create(data.action);
    const resource = AuditResource.create(data.entityType, data.entityId);

    const auditLog = AuditLog.create({
      workspaceId: data.workspaceId,
      userId: data.userId,
      action: action,
      resource: resource,
      details: data.details || null,
      metadata: data.metadata || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    });

    await this.auditRepository.save(auditLog);
    return auditLog;
  }

  /**
   * Get a specific audit log by ID.
   */
  async getAuditLogById(
    workspaceId: string,
    auditLogId: string
  ): Promise<AuditLogDTO | null> {
    const id = AuditLogId.fromString(auditLogId);
    const auditLog = await this.auditRepository.findById(id);

    // Ensure the audit log belongs to the workspace
    if (auditLog && auditLog.workspaceId !== workspaceId) {
      return null;
    }

    return auditLog ? auditLog.toJSON() : null;
  }

  /**
   * List audit logs with optional filters.
   */
  async listAuditLogs(
    workspaceId: string,
    filters?: ListAuditLogsFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<PaginatedResult<AuditLogDTO>> {
    const filter: AuditLogFilter = {
      workspaceId,
      limit,
      offset,
      ...filters,
    };

    const result = await this.auditRepository.findByFilter(filter);
    return {
      ...result,
      items: result.items.map((log) => log.toJSON()),
    };
  }

  /**
   * Get audit history for a specific entity.
   */
  async getEntityAuditHistory(
    workspaceId: string,
    entityType: string,
    entityId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<AuditLogDTO>> {
    const result = await this.auditRepository.findByEntityId(
      workspaceId,
      entityType,
      entityId,
      options
    );
    return {
      ...result,
      items: result.items.map((log) => log.toJSON()),
    };
  }

  /**
   * Get audit summary statistics for a workspace.
   */
  async getAuditSummary(
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AuditSummary> {
    const [totalLogs, actionBreakdown] = await Promise.all([
      this.auditRepository.countByWorkspace(workspaceId),
      this.auditRepository.getActionSummary(workspaceId, startDate, endDate),
    ]);

    return {
      totalLogs,
      actionBreakdown,
      period: { startDate, endDate },
    };
  }

  /**
   * Purge audit logs older than a specific number of days.
   */
  async purgeOldLogs(
    workspaceId: string,
    olderThanDays: number
  ): Promise<number> {
    const olderThan = new Date();
    olderThan.setDate(olderThan.getDate() - olderThanDays);

    return await this.auditRepository.deleteOlderThan(workspaceId, olderThan);
  }
}
