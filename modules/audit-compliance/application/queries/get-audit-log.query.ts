import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { AuditLog, AuditLogDTO } from '../../domain/entities/audit-log.entity';
import { AuditLogId } from '../../domain/value-objects/audit-log-id.vo';
import { IAuditLogRepository } from '../../domain/repositories/audit-log.repository';
import { AuditLogNotFoundError } from '../../domain/errors/audit.errors';

export interface GetAuditLogQuery extends IQuery {
  workspaceId: string;
  auditLogId: string;
}

export class GetAuditLogHandler implements IQueryHandler<
  GetAuditLogQuery,
  QueryResult<AuditLogDTO>
> {
  constructor(private readonly auditRepository: IAuditLogRepository) {}

  async handle(input: GetAuditLogQuery): Promise<QueryResult<AuditLogDTO>> {
    try {
      const id = AuditLogId.fromString(input.auditLogId);
      const auditLog = await this.auditRepository.findById(id);

      if (!auditLog || auditLog.workspaceId !== input.workspaceId) {
        throw new AuditLogNotFoundError(input.auditLogId);
      }

      return QueryResult.success(AuditLog.toDTO(auditLog));
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
