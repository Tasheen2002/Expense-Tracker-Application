import { AuditLog } from '../entities/audit-log.entity';
import { AuditLogId } from '../value-objects/audit-log-id.vo';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface AuditLogFilter extends PaginationOptions {
  workspaceId: string;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AuditActionSummary {
  action: string;
  count: number;
}

export interface IAuditLogRepository {
  save(auditLog: AuditLog): Promise<void>;
  /** Insert an externally identified event once, including under concurrent delivery. */
  saveIfAbsent(auditLog: AuditLog): Promise<boolean>;
  saveMany(auditLogs: AuditLog[]): Promise<void>;
  findById(id: AuditLogId, workspaceId: string): Promise<AuditLog | null>;
  findByWorkspace(
    workspaceId: string,
    limit?: number,
    offset?: number
  ): Promise<PaginatedResult<AuditLog>>;
  findByFilter(filter: AuditLogFilter): Promise<PaginatedResult<AuditLog>>;
  findByEntityId(
    workspaceId: string,
    entityType: string,
    entityId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<AuditLog>>;
  countByWorkspace(workspaceId: string): Promise<number>;
  countByAction(workspaceId: string, action: string): Promise<number>;
  getActionSummary(
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AuditActionSummary[]>;
  deleteOlderThan(workspaceId: string, olderThan: Date, purgedBy: string, requestedDays: number): Promise<number>;
}
