import { DomainEvent } from "../../../../apps/api/src/shared/domain/events/domain-event";

/**
 * Event emitted when a new audit log entry is created.
 */
export class AuditLogCreatedEvent extends DomainEvent {
  constructor(
    public readonly auditLogId: string,
    public readonly workspaceId: string,
    public readonly userId: string | null,
    public readonly action: string,
    public readonly entityType: string,
    public readonly entityId: string,
  ) {
    super(auditLogId, "AuditLog");
  }

  get eventType(): string {
    return "audit.log_created";
  }

  public getPayload(): Record<string, unknown> {
    return {
      auditLogId: this.auditLogId,
      workspaceId: this.workspaceId,
      userId: this.userId,
      action: this.action,
      entityType: this.entityType,
      entityId: this.entityId,
    };
  }
}

/**
 * Event emitted when audit logs are queried/exported.
 */
export class AuditLogsQueriedEvent extends DomainEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly queriedBy: string,
    public readonly filterCriteria: Record<string, unknown>,
    public readonly resultCount: number,
  ) {
    super(workspaceId, "AuditLog");
  }

  get eventType(): string {
    return "audit.logs_queried";
  }

  public getPayload(): Record<string, unknown> {
    return {
      workspaceId: this.workspaceId,
      queriedBy: this.queriedBy,
      filterCriteria: this.filterCriteria,
      resultCount: this.resultCount,
    };
  }
}

/**
 * Event emitted when audit log retention policy is applied.
 */
export class AuditRetentionAppliedEvent extends DomainEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly retentionDays: number,
    public readonly logsDeleted: number,
    public readonly appliedAt: Date,
  ) {
    super(workspaceId, "AuditLog");
  }

  get eventType(): string {
    return "audit.retention_applied";
  }

  public getPayload(): Record<string, unknown> {
    return {
      workspaceId: this.workspaceId,
      retentionDays: this.retentionDays,
      logsDeleted: this.logsDeleted,
      appliedAt: this.appliedAt.toISOString(),
    };
  }
}
