import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';
import { AuditService, ListAuditLogsFilters } from '../services/audit.service';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import { AuditLog } from '../../domain/entities/audit-log.entity';

export interface ListAuditLogsQuery extends IQuery {
  workspaceId: string;
  filters?: ListAuditLogsFilters;
  limit?: number;
  offset?: number;
}

export class ListAuditLogsHandler implements IQueryHandler<
  ListAuditLogsQuery,
  QueryResult<PaginatedResult<AuditLog>>
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(
    input: ListAuditLogsQuery
  ): Promise<QueryResult<PaginatedResult<AuditLog>>> {
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
