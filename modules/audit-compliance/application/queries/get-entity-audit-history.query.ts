import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { AuditLogDTO } from '../../domain/entities/audit-log.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { AuditService } from '../services/audit.service';

export interface GetEntityAuditHistoryQuery extends IQuery {
  workspaceId: string;
  entityType: string;
  entityId: string;
  limit?: number;
  offset?: number;
}

export class GetEntityAuditHistoryHandler implements IQueryHandler<
  GetEntityAuditHistoryQuery,
  PaginatedResult<AuditLogDTO>
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(input: GetEntityAuditHistoryQuery): Promise<PaginatedResult<AuditLogDTO>> {
    return this.auditService.getEntityAuditHistory(
      input.workspaceId,
      input.entityType,
      input.entityId,
      { limit: input.limit, offset: input.offset }
    );
  }
}
