import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import { AuditLogId } from '../value-objects/audit-log-id.vo';
import { AuditAction } from '../value-objects/audit-action.vo';
import { AuditResource } from '../value-objects/audit-resource.vo';

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
    public readonly entityId: string
  ) {
    super(auditLogId, 'AuditLog');
  }

  get eventType(): string {
    return 'audit.log_created';
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

export class AuditLogsPurgedEvent extends DomainEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly beforeDate: string,
    public readonly deletedCount: number
  ) {
    // Use workspaceId as the aggregate id since there is no single
    // audit-log aggregate that owns this bulk operation.
    super(workspaceId, 'AuditLog');
  }

  get eventType(): string {
    return 'audit.logs_purged';
  }

  public getPayload(): Record<string, unknown> {
    return {
      workspaceId: this.workspaceId,
      beforeDate: this.beforeDate,
      deletedCount: this.deletedCount,
    };
  }
}

// ============================================================================
// Entity
// ============================================================================

export interface AuditLogDTO {
  id: string;
  workspaceId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

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

export interface CreateAuditLogData {
  workspaceId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export class AuditLog extends AggregateRoot {
  private readonly props: AuditLogProps;

  private constructor(props: AuditLogProps) {
    super();
    this.props = props;
  }

  static create(data: CreateAuditLogData): AuditLog {
    const auditLogId = AuditLogId.create();

    const auditLog = new AuditLog({
      id: auditLogId,
      workspaceId: data.workspaceId,
      userId: data.userId,
      action: AuditAction.create(data.action),
      resource: AuditResource.create(data.entityType, data.entityId),
      details: data.details,
      metadata: data.metadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt: new Date(),
    });

    auditLog.addDomainEvent(
      new AuditLogCreatedEvent(
        auditLogId.getValue(),
        data.workspaceId,
        data.userId,
        data.action,
        data.entityType,
        data.entityId
      )
    );

    return auditLog;
  }

  static fromPersistence(props: AuditLogProps): AuditLog {
    return new AuditLog(props);
  }

  static toDTO(auditLog: AuditLog): AuditLogDTO {
    return {
      id: auditLog.id.getValue(),
      workspaceId: auditLog.workspaceId,
      userId: auditLog.userId,
      action: auditLog.action.getValue(),
      entityType: auditLog.resource.entityType,
      entityId: auditLog.resource.entityId,
      details: auditLog.details,
      metadata: auditLog.metadata,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      createdAt: auditLog.createdAt.toISOString(),
    };
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
