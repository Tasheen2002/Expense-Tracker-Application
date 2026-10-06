import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { UuidId } from '@core/domain/value-objects/uuid-id.base';
import { AccountAuditLog } from '../../domain/entities/account-audit-log.entity';
import { IAccountAuditLogRepository } from '../../domain/repositories/account-audit-log.repository';
import {
  InvalidAuditFilterError,
  InvalidAuditIdentityError,
} from '../../domain/errors/audit.errors';

export interface ListAccountAuditLogsQuery extends IQuery {
  readonly actorId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListAccountAuditLogsHandler implements IQueryHandler<
  ListAccountAuditLogsQuery,
  PaginatedResult<ReturnType<AccountAuditLog['toDTO']>>
> {
  constructor(private readonly repository: IAccountAuditLogRepository) {}

  async handle({ actorId, limit = 50, offset = 0 }: ListAccountAuditLogsQuery) {
    if (!UuidId.isValid(actorId)) throw new InvalidAuditIdentityError('userId');
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > 2147483647
    ) {
      throw new InvalidAuditFilterError(
        'pagination',
        'invalid limit or offset'
      );
    }
    const result = await this.repository.list(
      actorId.toLowerCase(),
      limit,
      offset
    );
    return { ...result, items: result.items.map((record) => record.toDTO()) };
  }
}
