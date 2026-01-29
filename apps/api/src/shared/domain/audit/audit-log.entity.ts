import { randomUUID } from "crypto";

/**
 * Audit action types for tracking user activities.
 */
export type AuditAction =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "SUBMIT"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "IMPORT";

/**
 * Audit log entry entity for tracking all system activities.
 * Provides compliance and security audit trail.
 */
export class AuditLog {
  private constructor(
    public readonly id: string,
    public readonly timestamp: Date,
    public readonly userId: string,
    public readonly workspaceId: string | null,
    public readonly action: AuditAction,
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly changes: Record<
      string,
      { old: unknown; new: unknown }
    > | null,
    public readonly metadata: Record<string, unknown> | null,
    public readonly ipAddress: string | null,
    public readonly userAgent: string | null,
  ) {}

  static create(params: {
    userId: string;
    workspaceId?: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    changes?: Record<string, { old: unknown; new: unknown }>;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): AuditLog {
    return new AuditLog(
      randomUUID(),
      new Date(),
      params.userId,
      params.workspaceId ?? null,
      params.action,
      params.entityType,
      params.entityId,
      params.changes ?? null,
      params.metadata ?? null,
      params.ipAddress ?? null,
      params.userAgent ?? null,
    );
  }

  static fromPersistence(data: {
    id: string;
    timestamp: Date;
    userId: string;
    workspaceId: string | null;
    action: AuditAction;
    entityType: string;
    entityId: string;
    changes: Record<string, { old: unknown; new: unknown }> | null;
    metadata: Record<string, unknown> | null;
    ipAddress: string | null;
    userAgent: string | null;
  }): AuditLog {
    return new AuditLog(
      data.id,
      data.timestamp,
      data.userId,
      data.workspaceId,
      data.action,
      data.entityType,
      data.entityId,
      data.changes,
      data.metadata,
      data.ipAddress,
      data.userAgent,
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      timestamp: this.timestamp.toISOString(),
      userId: this.userId,
      workspaceId: this.workspaceId,
      action: this.action,
      entityType: this.entityType,
      entityId: this.entityId,
      changes: this.changes,
      metadata: this.metadata,
    };
  }
}
