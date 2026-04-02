import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';
import { AuditService } from '../services/audit.service';
import { AuditLogDTO } from '../../domain/entities/audit-log.entity';
import { AuditLogNotFoundError } from '../../domain/errors/audit.errors';

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
      const auditLog = await this.auditService.getAuditLogById(
        input.workspaceId,
        input.auditLogId
      );
      if (!auditLog) {
        throw new AuditLogNotFoundError(input.auditLogId);
      }
      return QueryResult.success(auditLog);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
