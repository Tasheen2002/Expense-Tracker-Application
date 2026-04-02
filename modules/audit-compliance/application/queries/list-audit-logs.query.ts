import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { AuditService, ListAuditLogsFilters } from '../services/audit.service';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { AuditLogDTO } from '../../domain/entities/audit-log.entity';

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
  constructor(private readonly auditService: AuditService) {}

  async handle(
    input: ListAuditLogsQuery
  ): Promise<QueryResult<PaginatedResult<AuditLogDTO>>> {
    try {
      const result = await this.auditService.listAuditLogs(
        input.workspaceId,
        input.filters,
        input.limit,
        input.offset
      );
      return QueryResult.success(result);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
