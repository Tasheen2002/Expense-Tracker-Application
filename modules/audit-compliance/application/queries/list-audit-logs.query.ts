import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { AuditLogDTO } from '../../domain/entities/audit-log.entity';
import { AuditService } from '../services/audit.service';

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
  constructor(private readonly auditService: AuditService) {}

  async handle(
    input: ListAuditLogsQuery
  ): Promise<QueryResult<PaginatedResult<AuditLogDTO>>> {
    const result = await this.auditService.listAuditLogs(
      input.workspaceId,
      input.filters,
      input.limit,
      input.offset
    );
    return QueryResult.success(result);
  }
}
