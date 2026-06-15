import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';
import { AuditLogDTO } from '../../domain/entities/audit-log.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { AuditService } from '../services/audit.service';

export interface GetEntityAuditHistoryQuery extends IQuery {
  readonly workspaceId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class GetEntityAuditHistoryHandler implements IQueryHandler<
  GetEntityAuditHistoryQuery,
  PaginatedResult<AuditLogDTO>
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(query: GetEntityAuditHistoryQuery): Promise<PaginatedResult<AuditLogDTO>> {
    return this.auditService.getEntityAuditHistory(
      query.workspaceId,
      query.entityType,
      query.entityId,
      { limit: query.limit, offset: query.offset }
    );
  }
}
