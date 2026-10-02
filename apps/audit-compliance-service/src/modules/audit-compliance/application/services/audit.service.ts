import { AuditLog, AuditLogDTO } from '../../domain/entities/audit-log.entity';
import { AuditLogId } from '../../domain/value-objects/audit-log-id.vo';
import { IAuditLogRepository, AuditLogFilter } from '../../domain/repositories/audit-log.repository';
import { AuditLogNotFoundError, AuditRetentionViolationError, InvalidAuditDateRangeError, InvalidAuditFilterError } from '../../domain/errors/audit.errors';
import { PaginatedResult, PaginationOptions } from '@core/domain/interfaces/paginated-result.interface';
import { z } from 'zod';

const uuid = z.string().uuid();
const actorFields = [
  'submittedBy', 'approvedBy', 'rejectedBy', 'changedBy', 'createdBy',
  'updatedBy', 'deletedBy', 'triggeredBy', 'recordedBy', 'requestedBy', 'userId',
] as const;

export interface ExternalAuditEvent {
  eventId: string;
  eventType: string;
  aggregateId?: string;
  aggregateType?: string;
  payload: Record<string, unknown>;
  occurredAt?: Date;
}

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

  async recordExternalEvent(event: ExternalAuditEvent): Promise<{ auditLogId: string; duplicate: boolean }> {
    const id = AuditLogId.fromString(event.eventId);
    const workspaceCandidate = event.payload.workspaceId === undefined &&
      event.aggregateType?.toLowerCase() === 'workspace'
      ? event.aggregateId : event.payload.workspaceId;
    const workspaceId = uuid.parse(workspaceCandidate);
    const actorField = actorFields.find((field) => event.payload[field] !== undefined && event.payload[field] !== null);
    const userId = actorField ? uuid.parse(event.payload[actorField]) : null;
    const entityId = event.aggregateId && uuid.safeParse(event.aggregateId).success
      ? event.aggregateId : event.eventId;
    const auditLog = AuditLog.create({
      id,
      createdAt: event.occurredAt,
      workspaceId,
      userId,
      action: event.eventType,
      entityType: event.aggregateType || 'OutboxEvent',
      entityId,
      details: event.payload,
      metadata: {
        source: 'outbox-event',
        eventId: event.eventId,
        eventTimestamp: event.occurredAt?.toISOString() ?? null,
      },
      ipAddress: null,
      userAgent: null,
    });
    const inserted = await this.auditRepository.saveIfAbsent(auditLog);
    return { auditLogId: event.eventId, duplicate: !inserted };
  }

  async createAuditLog(data: CreateAuditLogDTO): Promise<AuditLogDTO> {
    const auditLog = AuditLog.create({
      workspaceId: data.workspaceId,
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      details: data.details || null,
      metadata: {
        source: 'manual-api',
        ...(data.metadata ? { submittedMetadata: data.metadata } : {}),
      },
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    });

    await this.auditRepository.save(auditLog);
    return AuditLog.toDTO(auditLog);
  }

  async getAuditLog(auditLogId: string, workspaceId: string): Promise<AuditLogDTO> {
    const id = AuditLogId.fromString(auditLogId);
    const auditLog = await this.auditRepository.findById(id, workspaceId);

    if (!auditLog || auditLog.workspaceId !== workspaceId) {
      throw new AuditLogNotFoundError(auditLogId);
    }

    return AuditLog.toDTO(auditLog);
  }

  async listAuditLogs(
    workspaceId: string,
    filters?: Omit<AuditLogFilter, 'workspaceId' | 'limit' | 'offset'>,
    limit = 50,
    offset = 0
  ): Promise<PaginatedResult<AuditLogDTO>> {
    this.validateDateRange(filters?.startDate, filters?.endDate);
    this.validatePagination(limit, offset);
    const filter: AuditLogFilter = { ...filters, workspaceId, limit, offset };
    const result = await this.auditRepository.findByFilter(filter);
    return { ...result, items: result.items.map((log) => AuditLog.toDTO(log)) };
  }

  async getEntityAuditHistory(
    workspaceId: string,
    entityType: string,
    entityId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<AuditLogDTO>> {
    this.validatePagination(options?.limit ?? 50, options?.offset ?? 0);
    const result = await this.auditRepository.findByEntityId(workspaceId, entityType, entityId, options);
    return { ...result, items: result.items.map((log) => AuditLog.toDTO(log)) };
  }

  async getAuditSummary(
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AuditSummary> {
    this.validateDateRange(startDate, endDate);
    const actionBreakdown = await this.auditRepository.getActionSummary(workspaceId, startDate, endDate);
    const totalLogs = actionBreakdown.reduce((total, item) => total + item.count, 0);
    return { totalLogs, actionBreakdown, period: { startDate, endDate } };
  }

  private static readonly MIN_RETENTION_DAYS = 30;

  private validateDateRange(startDate?: Date, endDate?: Date): void {
    if (startDate && Number.isNaN(startDate.getTime())) {
      throw new InvalidAuditFilterError('startDate', 'must be a valid date');
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      throw new InvalidAuditFilterError('endDate', 'must be a valid date');
    }
    if (startDate && endDate && startDate > endDate) {
      throw new InvalidAuditDateRangeError(startDate, endDate);
    }
  }

  private validatePagination(limit: number, offset: number): void {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new InvalidAuditFilterError('limit', 'must be a whole number from 1 to 100');
    }
    if (!Number.isInteger(offset) || offset < 0 || offset > 2147483647) {
      throw new InvalidAuditFilterError('offset', 'must be a whole number from 0 to 2147483647');
    }
  }

  async purgeOldLogs(workspaceId: string, olderThanDays: number, purgedBy: string): Promise<number> {
    if (!Number.isSafeInteger(olderThanDays)) {
      throw new InvalidAuditFilterError('olderThanDays', 'must be a whole number of days');
    }
    if (olderThanDays < AuditService.MIN_RETENTION_DAYS) {
      throw new AuditRetentionViolationError(AuditService.MIN_RETENTION_DAYS, olderThanDays);
    }
    if (olderThanDays > 36500) {
      throw new InvalidAuditFilterError('olderThanDays', 'must not exceed 36500');
    }

    const olderThan = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    return await this.auditRepository.deleteOlderThan(workspaceId, olderThan, purgedBy, olderThanDays);
  }
}
