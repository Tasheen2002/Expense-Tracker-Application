import { AuditLog } from '../../domain/entities/audit-log.entity';
import { AuditAction } from '../../domain/value-objects/audit-action.vo';
import { AuditResource } from '../../domain/value-objects/audit-resource.vo';
import { IAuditLogRepository } from '../../domain/repositories/audit-log.repository';
import { AuditRetentionViolationError } from '../../domain/errors/audit.errors';

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

export class AuditService {
  constructor(private readonly auditRepository: IAuditLogRepository) {}

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

  private static readonly MIN_RETENTION_DAYS = 30;

  /**
   * Purge audit logs older than a specific number of days.
   * Minimum retention period is 30 days.
   */
  async purgeOldLogs(
    workspaceId: string,
    olderThanDays: number
  ): Promise<number> {
    if (olderThanDays < AuditService.MIN_RETENTION_DAYS) {
      throw new AuditRetentionViolationError(AuditService.MIN_RETENTION_DAYS, olderThanDays);
    }

    const olderThan = new Date();
    olderThan.setDate(olderThan.getDate() - olderThanDays);

    return await this.auditRepository.deleteOlderThan(workspaceId, olderThan);
  }
}
