import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { AuditLogDTO } from '../../domain/entities/audit-log.entity';
import { AuditService } from '../services/audit.service';

export interface GetAuditLogQuery extends IQuery {
  workspaceId: string;
  auditLogId: string;
}

export class GetAuditLogHandler implements IQueryHandler<
  GetAuditLogQuery,
  AuditLogDTO
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(input: GetAuditLogQuery): Promise<AuditLogDTO> {
    return this.auditService.getAuditLog(input.auditLogId, input.workspaceId);
  }
}
