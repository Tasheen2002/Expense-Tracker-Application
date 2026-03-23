import { AuditLog } from '../../domain/entities/audit-log.entity';
import { AuditAction } from '../../domain/value-objects/audit-action.vo';
import { AuditResource } from '../../domain/value-objects/audit-resource.vo';
import { AuditLogId } from '../../domain/value-objects/audit-log-id.vo';
import {
  IAuditLogRepository,
  AuditLogFilter,
} from '../../domain/repositories/audit-log.repository';
import { AuditRetentionViolationError } from '../../domain/errors/audit.errors';
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
  private static readonly MINIMUM_RETENTION_DAYS = 30;

  constructor(private readonly auditRepository: IAuditLogRepository) {}

  /**
   * Creates an audit log entry. Used by both the HTTP API (via CreateAuditLogHandler)
   * and event-driven paths (via AuditEventListener → CreateAuditLogHandler).
   * Tracks consecutive failures and alerts when the threshold is exceeded.
   */
  async createAuditLog(data: CreateAuditLogDTO): Promise<AuditLog> {
    try {
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
      this.consecutiveFailures = 0;
      return auditLog;
    } catch (error: unknown) {
      this.consecutiveFailures++;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.error(
        `[AuditService] AUDIT_FAILURE: Failed to create audit log ` +
          `(failure #${this.consecutiveFailures}): ${errorMessage}`
      );

      if (this.consecutiveFailures >= AuditService.FAILURE_ALERT_THRESHOLD) {
        console.error(
          `[AuditService] CRITICAL: ${this.consecutiveFailures} consecutive audit failures. ` +
            `Audit trail may be incomplete. Immediate investigation required.`
        );
      }

      throw error;
    }
  }

  /**
   * Purges audit logs older than the specified number of days.
   * Enforces a minimum retention period to prevent accidental data loss.
   * Returns the number of deleted records.
   */
  async purgeOldLogs(
    workspaceId: string,
    olderThanDays: number
  ): Promise<number> {
    if (olderThanDays < AuditService.MINIMUM_RETENTION_DAYS) {
      throw new AuditRetentionViolationError(
        AuditService.MINIMUM_RETENTION_DAYS,
        olderThanDays
      );
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    return await this.auditRepository.deleteOlderThan(
      workspaceId,
      cutoffDate
    );
  }

  /**
   * Get a specific audit log by ID.
   */
  async getAuditLogById(
    workspaceId: string,
    auditLogId: string
  ): Promise<AuditLog | null> {
    const id = AuditLogId.fromString(auditLogId);
    const auditLog = await this.auditRepository.findById(id);

    // Ensure the audit log belongs to the workspace
    if (auditLog && auditLog.workspaceId !== workspaceId) {
      return null;
    }

    return auditLog;
  }

  /**
   * List audit logs with optional filters.
   */
  async listAuditLogs(
    workspaceId: string,
    filters?: ListAuditLogsFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<PaginatedResult<AuditLog>> {
    const filter: AuditLogFilter = {
      workspaceId,
      limit,
      offset,
      ...filters,
    };

    return await this.auditRepository.findByFilter(filter);
  }

  /**
   * Get audit history for a specific entity.
   */
  async getEntityAuditHistory(
    workspaceId: string,
    entityType: string,
    entityId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<AuditLog>> {
    return await this.auditRepository.findByEntityId(
      workspaceId,
      entityType,
      entityId,
      options
    );
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
}
