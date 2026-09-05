import { AuditLog, AuditLogDTO } from '../../domain/entities/audit-log.entity';
import { AuditLogId } from '../../domain/value-objects/audit-log-id.vo';
import { IAuditLogRepository, AuditLogFilter } from '../../domain/repositories/audit-log.repository';
import { AuditLogNotFoundError, AuditRetentionViolationError } from '../../domain/errors/audit.errors';
import { PaginatedResult, PaginationOptions } from '@core/domain/interfaces/paginated-result.interface';

export type { AuditLogDTO };

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

export class AuditService {
  constructor(private readonly auditRepository: IAuditLogRepository) {}

  async createAuditLog(data: CreateAuditLogDTO): Promise<AuditLogDTO> {
    const auditLog = AuditLog.create({
      workspaceId: data.workspaceId,
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      details: data.details || null,
      metadata: data.metadata || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    });

    await this.auditRepository.save(auditLog);
    return AuditLog.toDTO(auditLog);
  }

  async getAuditLog(auditLogId: string, workspaceId: string): Promise<AuditLogDTO> {
    const id = AuditLogId.fromString(auditLogId);
    const auditLog = await this.auditRepository.findById(id);

    if (!auditLog || auditLog.workspaceId !== workspaceId) {
      throw new AuditLogNotFoundError(auditLogId);
    }

    return AuditLog.toDTO(auditLog);
  }

  async listAuditLogs(
    workspaceId: string,
    filters?: Omit<AuditLogFilter, 'workspaceId'>,
    limit = 50,
    offset = 0
  ): Promise<PaginatedResult<AuditLogDTO>> {
    const filter: AuditLogFilter = { workspaceId, limit, offset, ...filters };
    const result = await this.auditRepository.findByFilter(filter);
    return { ...result, items: result.items.map((log) => AuditLog.toDTO(log)) };
  }

  async getEntityAuditHistory(
    workspaceId: string,
    entityType: string,
    entityId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<AuditLogDTO>> {
    const result = await this.auditRepository.findByEntityId(workspaceId, entityType, entityId, options);
    return { ...result, items: result.items.map((log) => AuditLog.toDTO(log)) };
  }

  async getAuditSummary(
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AuditSummary> {
    const [totalLogs, actionBreakdown] = await Promise.all([
      this.auditRepository.countByWorkspace(workspaceId),
      this.auditRepository.getActionSummary(workspaceId, startDate, endDate),
    ]);
    return { totalLogs, actionBreakdown, period: { startDate, endDate } };
  }

  private static readonly MIN_RETENTION_DAYS = 30;

  async purgeOldLogs(workspaceId: string, olderThanDays: number): Promise<number> {
    if (olderThanDays < AuditService.MIN_RETENTION_DAYS) {
      throw new AuditRetentionViolationError(AuditService.MIN_RETENTION_DAYS, olderThanDays);
    }

    const olderThan = new Date();
    olderThan.setDate(olderThan.getDate() - olderThanDays);

    return await this.auditRepository.deleteOlderThan(workspaceId, olderThan);
  }
}
