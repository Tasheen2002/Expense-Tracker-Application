import { AggregateRoot } from '@core/domain/aggregate-root';
import { AuditLogId } from '../value-objects/audit-log-id.vo';
import { AuditAction } from '../value-objects/audit-action.vo';
import { AuditResource } from '../value-objects/audit-resource.vo';
import { UuidId } from '@core/domain/value-objects/uuid-id.base';
import { InvalidAuditIdentityError } from '../errors/audit.errors';

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
  id?: AuditLogId;
  createdAt?: Date;
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
    this.props = {
      ...props,
      details: props.details === null ? null : structuredClone(props.details),
      metadata: props.metadata === null ? null : structuredClone(props.metadata),
      createdAt: new Date(props.createdAt),
    };
  }

  static create(data: CreateAuditLogData): AuditLog {
    const auditLogId = data.id ?? AuditLogId.create();
    const createdAt = data.createdAt ?? new Date();
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error('Invalid audit log timestamp');
    }
    if (!UuidId.isValid(data.workspaceId)) throw new InvalidAuditIdentityError('workspaceId');
    if (data.userId !== null && !UuidId.isValid(data.userId)) throw new InvalidAuditIdentityError('userId');

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
      createdAt: new Date(createdAt),
    });

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
    return this.props.details === null ? null : structuredClone(this.props.details);
  }

  get metadata(): Record<string, unknown> | null {
    return this.props.metadata === null ? null : structuredClone(this.props.metadata);
  }

  get ipAddress(): string | null {
    return this.props.ipAddress;
  }

  get userAgent(): string | null {
    return this.props.userAgent;
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }
}
