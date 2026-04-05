import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { IAuditLogRepository } from '../../domain/repositories/audit-log.repository';
import { AuditLog, AuditLogDTO } from '../../domain/entities/audit-log.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface GetEntityAuditHistoryQuery extends IQuery {
  workspaceId: string;
  entityType: string;
  entityId: string;
  limit?: number;
  offset?: number;
}

export class GetEntityAuditHistoryHandler implements IQueryHandler<
  GetEntityAuditHistoryQuery,
  QueryResult<PaginatedResult<AuditLogDTO>>
> {
  constructor(private readonly auditRepository: IAuditLogRepository) {}

  async handle(
    input: GetEntityAuditHistoryQuery
  ): Promise<QueryResult<PaginatedResult<AuditLogDTO>>> {
    try {
      const result = await this.auditRepository.findByEntityId(
        input.workspaceId,
        input.entityType,
        input.entityId,
        { limit: input.limit, offset: input.offset }
      );

      return QueryResult.success({
        ...result,
        items: result.items.map((log) => AuditLog.toDTO(log)),
      });
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
