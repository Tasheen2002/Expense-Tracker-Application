import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { AuditService, AuditSummary } from '../services/audit.service';

export type { AuditSummary };

export interface GetAuditSummaryQuery extends IQuery {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
}

export class GetAuditSummaryHandler implements IQueryHandler<
  GetAuditSummaryQuery,
  AuditSummary
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(input: GetAuditSummaryQuery): Promise<AuditSummary> {
    return this.auditService.getAuditSummary(
      input.workspaceId,
      input.startDate,
      input.endDate
    );
  }
}
