import { AuditLog, AuditAction } from "./audit-log.entity";
import { IAuditLogRepository } from "./audit-log.repository";

/**
 * Context information for audit logging.
 */
export interface AuditContext {
  userId: string;
  workspaceId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Service for recording and querying audit logs.
 * Provides a high-level API for audit trail management.
 */
export class AuditService {
  constructor(private readonly auditRepository: IAuditLogRepository) {}

  /**
   * Logs a create action.
   */
  async logCreate(
    context: AuditContext,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log(
      context,
      "CREATE",
      entityType,
      entityId,
      undefined,
      metadata,
    );
  }

  /**
   * Logs a read/view action.
   */
  async logRead(
    context: AuditContext,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    await this.log(context, "READ", entityType, entityId);
  }

  /**
   * Logs an update action with change tracking.
   */
  async logUpdate(
    context: AuditContext,
    entityType: string,
    entityId: string,
    changes: Record<string, { old: unknown; new: unknown }>,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log(context, "UPDATE", entityType, entityId, changes, metadata);
  }

  /**
   * Logs a delete action.
   */
  async logDelete(
    context: AuditContext,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log(
      context,
      "DELETE",
      entityType,
      entityId,
      undefined,
      metadata,
    );
  }

  /**
   * Logs an approval action.
   */
  async logApproval(
    context: AuditContext,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log(
      context,
      "APPROVE",
      entityType,
      entityId,
      undefined,
      metadata,
    );
  }

  /**
   * Logs a rejection action.
   */
  async logRejection(
    context: AuditContext,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log(
      context,
      "REJECT",
      entityType,
      entityId,
      undefined,
      metadata,
    );
  }

  /**
   * Logs a submit action.
   */
  async logSubmit(
    context: AuditContext,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.log(
      context,
      "SUBMIT",
      entityType,
      entityId,
      undefined,
      metadata,
    );
  }

  /**
   * Logs a login action.
   */
  async logLogin(context: AuditContext): Promise<void> {
    await this.log(context, "LOGIN", "User", context.userId);
  }

  /**
   * Logs a logout action.
   */
  async logLogout(context: AuditContext): Promise<void> {
    await this.log(context, "LOGOUT", "User", context.userId);
  }

  /**
   * Generic logging method.
   */
  private async log(
    context: AuditContext,
    action: AuditAction,
    entityType: string,
    entityId: string,
    changes?: Record<string, { old: unknown; new: unknown }>,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const auditLog = AuditLog.create({
      userId: context.userId,
      workspaceId: context.workspaceId,
      action,
      entityType,
      entityId,
      changes,
      metadata,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    try {
      await this.auditRepository.save(auditLog);
    } catch (error) {
      // Audit logging should not fail the main operation
      console.error("[AuditService] Failed to save audit log:", error);
    }
  }

  /**
   * Queries audit logs with filters.
   */
  async queryLogs(options: {
    workspaceId?: string;
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: AuditLog[]; total: number }> {
    return this.auditRepository.query(options);
  }

  /**
   * Gets audit trail for a specific entity.
   */
  async getEntityAuditTrail(
    entityType: string,
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.auditRepository.findByEntity(entityType, entityId);
  }

  /**
   * Cleans up old audit logs (for data retention compliance).
   */
  async cleanupOldLogs(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    return this.auditRepository.deleteOlderThan(cutoffDate);
  }
}
