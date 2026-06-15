import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';
import { AuditLogDTO } from '../../domain/entities/audit-log.entity';
import { AuditService } from '../services/audit.service';

export interface GetAuditLogQuery extends IQuery {
  readonly workspaceId: string;
  readonly auditLogId: string;
}

export class GetAuditLogHandler implements IQueryHandler<
  GetAuditLogQuery,
  AuditLogDTO
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(query: GetAuditLogQuery): Promise<AuditLogDTO> {
    return this.auditService.getAuditLog(query.auditLogId, query.workspaceId);
  }
}
