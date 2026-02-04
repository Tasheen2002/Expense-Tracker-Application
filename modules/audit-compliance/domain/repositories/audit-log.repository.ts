import { AuditLog } from "../entities/audit-log.entity";
import { AuditLogId } from "../value-objects/audit-log-id.vo";

export interface AuditLogFilter {
  workspaceId: string;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface PaginatedAuditLogs {
  items: AuditLog[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<void>;
  saveMany(auditLogs: AuditLog[]): Promise<void>;
  findById(id: AuditLogId): Promise<AuditLog | null>;
  findByWorkspace(
    workspaceId: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedAuditLogs>;
  findByFilter(filter: AuditLogFilter): Promise<PaginatedAuditLogs>;
  findByEntityId(
    workspaceId: string,
    entityType: string,
    entityId: string,
  ): Promise<AuditLog[]>;
  countByWorkspace(workspaceId: string): Promise<number>;
  countByAction(workspaceId: string, action: string): Promise<number>;
  getActionSummary(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ action: string; count: number }[]>;
  deleteOlderThan(workspaceId: string, olderThan: Date): Promise<number>;
}
