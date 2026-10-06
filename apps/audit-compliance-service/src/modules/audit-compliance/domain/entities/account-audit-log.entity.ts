import { UuidId } from '@core/domain/value-objects/uuid-id.base';
import { InvalidAccountAuditError } from '../errors/audit.errors';

export interface AccountAuditLogData {
  id: string;
  userId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  fingerprint: string;
  createdAt: Date;
}

export class AccountAuditLog {
  private constructor(private readonly props: AccountAuditLogData) {}
  static create(data: AccountAuditLogData): AccountAuditLog {
    for (const key of ['id', 'userId', 'entityId'] as const) {
      if (!UuidId.isValid(data[key])) throw new InvalidAccountAuditError(key);
    }
    if (
      !data.eventType.trim() ||
      data.eventType.length > 100 ||
      !data.entityType.trim() ||
      data.entityType.length > 100 ||
      !/^[a-f0-9]{64}$/.test(data.fingerprint) ||
      !Number.isFinite(data.createdAt.getTime())
    )
      throw new InvalidAccountAuditError('record');
    return new AccountAuditLog({
      ...data,
      id: data.id.toLowerCase(),
      userId: data.userId.toLowerCase(),
      entityId: data.entityId.toLowerCase(),
      details: structuredClone(data.details),
      createdAt: new Date(data.createdAt),
    });
  }
  toPersistence(): AccountAuditLogData {
    return {
      ...this.props,
      details: structuredClone(this.props.details),
      createdAt: new Date(this.props.createdAt),
    };
  }
  toDTO() {
    const { fingerprint: _fingerprint, ...data } = this.toPersistence();
    return {
      ...data,
      scope: 'account' as const,
      createdAt: data.createdAt.toISOString(),
    };
  }
}
