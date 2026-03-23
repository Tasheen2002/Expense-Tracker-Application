import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';
import { AuditService } from '../services/audit.service';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';

export interface GetEntityAuditHistoryQuery extends IQuery {
  workspaceId: string;
  entityType: string;
  entityId: string;
  limit?: number;
  offset?: number;
}

export class GetEntityAuditHistoryHandler implements IQueryHandler<
  GetEntityAuditHistoryQuery,
  QueryResult<PaginatedResult<AuditLog>>
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(
    input: GetEntityAuditHistoryQuery
  ): Promise<QueryResult<PaginatedResult<AuditLog>>> {
    try {
      const options = {
        limit: input.limit,
        offset: input.offset,
      };

      const result = await this.auditService.getEntityAuditHistory(
        input.workspaceId,
        input.entityType,
        input.entityId,
        options
      );

      return QueryResult.success(result);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
