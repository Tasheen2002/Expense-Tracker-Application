import { createHash } from 'node:crypto';
import {
  accountEventOwner,
  canonicalEventJson,
  AccountEventEnvelope,
} from '../../../../../../../packages/contracts/src/account-events';
import { AccountAuditLog } from '../../domain/entities/account-audit-log.entity';
import { IAccountAuditLogRepository } from '../../domain/repositories/account-audit-log.repository';
import { InvalidAccountAuditError } from '../../domain/errors/audit.errors';

export class AccountAuditService {
  constructor(private readonly repository: IAccountAuditLogRepository) {}
  async record(event: AccountEventEnvelope) {
    const userId = accountEventOwner(event);
    if (!userId) throw new InvalidAccountAuditError('scope');
    const record = AccountAuditLog.create({
      id: event.eventId,
      userId,
      eventType: event.eventType,
      entityType: event.aggregateType!,
      entityId: event.aggregateId!,
      details: event.payload,
      fingerprint: createHash('sha256')
        .update(canonicalEventJson(event))
        .digest('hex'),
      createdAt: event.timestamp ? new Date(event.timestamp) : new Date(),
    });
    return {
      auditLogId: event.eventId,
      duplicate: !(await this.repository.saveIfAbsent(record)),
    };
  }
}
