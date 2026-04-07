import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { AuditLogDTO } from '../../domain/entities/audit-log.entity';
import { AuditService } from '../services/audit.service';

export interface GetAuditLogQuery extends IQuery {
  workspaceId: string;
  auditLogId: string;
}

export class GetAuditLogHandler implements IQueryHandler<
  GetAuditLogQuery,
  QueryResult<AuditLogDTO>
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(input: GetAuditLogQuery): Promise<QueryResult<AuditLogDTO>> {
    try {
      const auditLog = await this.auditService.getAuditLog(input.auditLogId, input.workspaceId);
      return QueryResult.success(auditLog);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
