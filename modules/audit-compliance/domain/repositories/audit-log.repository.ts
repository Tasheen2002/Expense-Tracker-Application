import { AuditLog } from "../entities/audit-log.entity";
import { AuditLogId } from "../value-objects/audit-log-id.vo";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

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

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<void>;
  saveMany(auditLogs: AuditLog[]): Promise<void>;
  findById(id: AuditLogId): Promise<AuditLog | null>;
  findByWorkspace(
    workspaceId: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResult<AuditLog>>;
  findByFilter(filter: AuditLogFilter): Promise<PaginatedResult<AuditLog>>;
  findByEntityId(
    workspaceId: string,
    entityType: string,
    entityId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<AuditLog>>;
  countByWorkspace(workspaceId: string): Promise<number>;
  countByAction(workspaceId: string, action: string): Promise<number>;
  getActionSummary(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ action: string; count: number }[]>;
  deleteOlderThan(workspaceId: string, olderThan: Date): Promise<number>;
}
