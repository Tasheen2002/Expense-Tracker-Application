import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { AuditLogDTO } from '../../domain/entities/audit-log.entity';
import { AuditService } from '../services/audit.service';

export interface ListAuditLogsFilters {
  readonly userId?: string;
  readonly action?: string;
  readonly entityType?: string;
  readonly entityId?: string;
  readonly startDate?: Date;
  readonly endDate?: Date;
}

export interface ListAuditLogsQuery extends IQuery {
  readonly workspaceId: string;
  readonly filters?: ListAuditLogsFilters;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListAuditLogsHandler implements IQueryHandler<
  ListAuditLogsQuery,
  PaginatedResult<AuditLogDTO>
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(query: ListAuditLogsQuery): Promise<PaginatedResult<AuditLogDTO>> {
    return this.auditService.listAuditLogs(
      query.workspaceId,
      query.filters,
      query.limit,
      query.offset
    );
  }
}
