import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { IAuditLogRepository, AuditLogFilter } from '../../domain/repositories/audit-log.repository';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { AuditLog, AuditLogDTO } from '../../domain/entities/audit-log.entity';

export interface ListAuditLogsFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ListAuditLogsQuery extends IQuery {
  workspaceId: string;
  filters?: ListAuditLogsFilters;
  limit?: number;
  offset?: number;
}

export class ListAuditLogsHandler implements IQueryHandler<
  ListAuditLogsQuery,
  QueryResult<PaginatedResult<AuditLogDTO>>
> {
  constructor(private readonly auditRepository: IAuditLogRepository) {}

  async handle(
    input: ListAuditLogsQuery
  ): Promise<QueryResult<PaginatedResult<AuditLogDTO>>> {
    try {
      const filter: AuditLogFilter = {
        workspaceId: input.workspaceId,
        limit: input.limit ?? 50,
        offset: input.offset ?? 0,
        ...input.filters,
      };

      const result = await this.auditRepository.findByFilter(filter);
      return QueryResult.success({
        ...result,
        items: result.items.map((log) => AuditLog.toDTO(log)),
      });
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
