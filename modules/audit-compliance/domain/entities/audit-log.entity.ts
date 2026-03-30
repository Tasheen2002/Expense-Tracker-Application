import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";
import { AuditLogId } from "../value-objects/audit-log-id.vo";
import { AuditAction } from "../value-objects/audit-action.vo";
import { AuditResource } from "../value-objects/audit-resource.vo";

// ============================================================================
// Domain Events
// ============================================================================

/**
 * Emitted when a new audit log entry is created.
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

  protected getPayload(): Record<string, unknown> {
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
 * Emitted when audit logs are queried/exported (for meta-auditing).
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

  protected getPayload(): Record<string, unknown> {
    return {
      workspaceId: this.workspaceId,
      queriedBy: this.queriedBy,
      filterCriteria: this.filterCriteria,
      resultCount: this.resultCount,
    };
  }
}

/**
 * Emitted when audit log retention policy is applied.
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

  protected getPayload(): Record<string, unknown> {
    return {
      workspaceId: this.workspaceId,
      retentionDays: this.retentionDays,
      logsDeleted: this.logsDeleted,
      appliedAt: this.appliedAt.toISOString(),
    };
  }
}

// ============================================================================
// Entity
// ============================================================================

export interface AuditLogProps {
  id: AuditLogId;
  workspaceId: string;
  userId: string | null;
  action: AuditAction;
  resource: AuditResource;
  details: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export class AuditLog extends AggregateRoot {
  private readonly props: AuditLogProps;

  private constructor(props: AuditLogProps) {
    super();
    this.props = props;
  }

  static create(props: Omit<AuditLogProps, "id" | "createdAt">): AuditLog {
    const auditLogId = AuditLogId.create();

    const auditLog = new AuditLog({
      ...props,
      id: auditLogId,
      action: props.action,
      resource: props.resource,
      createdAt: new Date(),
    });

    auditLog.addDomainEvent(
      new AuditLogCreatedEvent(
        auditLogId.getValue(),
        props.workspaceId,
        props.userId,
        props.action.getValue(),
        props.resource.entityType,
        props.resource.entityId,
      ),
    );

    return auditLog;
  }

  static fromPersistence(props: AuditLogProps): AuditLog {
    return new AuditLog(props);
  }

  // Getters
  get id(): AuditLogId {
    return this.props.id;
  }

  get workspaceId(): string {
    return this.props.workspaceId;
  }

  get userId(): string | null {
    return this.props.userId;
  }

  get action(): AuditAction {
    return this.props.action;
  }

  get resource(): AuditResource {
    return this.props.resource;
  }

  get details(): Record<string, unknown> | null {
    return this.props.details;
  }

  get metadata(): Record<string, unknown> | null {
    return this.props.metadata;
  }

  get ipAddress(): string | null {
    return this.props.ipAddress;
  }

  get userAgent(): string | null {
    return this.props.userAgent;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
