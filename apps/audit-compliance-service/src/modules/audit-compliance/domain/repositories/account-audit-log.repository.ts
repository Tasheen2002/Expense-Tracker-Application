import { AccountAuditLog } from '../entities/account-audit-log.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
export interface IAccountAuditLogRepository {
  saveIfAbsent(record: AccountAuditLog): Promise<boolean>;
  list(
    userId: string,
    limit: number,
    offset: number
  ): Promise<PaginatedResult<AccountAuditLog>>;
}
