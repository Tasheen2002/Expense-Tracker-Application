import { AuditLog } from "./audit-log.entity";

/**
 * Pagination options for audit log queries.
 */
export interface AuditLogQueryOptions {
  page?: number;
  pageSize?: number;
  userId?: string;
  workspaceId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Repository interface for audit log persistence.
 */
export interface IAuditLogRepository {
  save(auditLog: AuditLog): Promise<void>;
  saveMany(auditLogs: AuditLog[]): Promise<void>;
  findById(id: string): Promise<AuditLog | null>;
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  findByUser(
    userId: string,
    options?: AuditLogQueryOptions,
  ): Promise<AuditLog[]>;
  findByWorkspace(
    workspaceId: string,
    options?: AuditLogQueryOptions,
  ): Promise<AuditLog[]>;
  query(
    options: AuditLogQueryOptions,
  ): Promise<{ items: AuditLog[]; total: number }>;
  deleteOlderThan(date: Date): Promise<number>;
}
