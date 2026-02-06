import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";
import { AuditLog } from "../../domain/entities/audit-log.entity";
import { AuditAction } from "../../domain/value-objects/audit-action.vo";
import { AuditResource } from "../../domain/value-objects/audit-resource.vo";
import { AuditLogId } from "../../domain/value-objects/audit-log-id.vo";
import {
  AuditLogRepository,
  AuditLogFilter,
} from "../../domain/repositories/audit-log.repository";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

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
  constructor(private readonly auditRepository: AuditLogRepository) {}

  /**
   * Logs a domain event to the audit log.
   */
  async log(event: DomainEvent): Promise<void> {
    try {
      // Check if event has getPayload method (most domain events do)
      const hasGetPayload = typeof (event as any).getPayload === 'function';
      const payload = hasGetPayload ? (event as any).getPayload() : {};
      const workspaceId = payload.workspaceId || "system";
      const userId = payload.triggeredBy || payload.userId || null;

      const action = AuditAction.create(event.eventType);
      const resource = AuditResource.create(
        event.aggregateId.split(":")[0] || "Unknown",
        event.aggregateId,
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
    } catch (error) {
      console.error("[AuditService] Failed to log event:", error);
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
    auditLogId: string,
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
    offset: number = 0,
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
    options?: PaginationOptions,
  ): Promise<PaginatedResult<AuditLog>> {
    return await this.auditRepository.findByEntityId(
      workspaceId,
      entityType,
      entityId,
      options,
    );
  }

  /**
   * Get audit summary statistics for a workspace.
   */
  async getAuditSummary(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
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
