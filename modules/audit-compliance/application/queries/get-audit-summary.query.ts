import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';
import { AuditService, AuditSummary } from '../services/audit.service';

export type { AuditSummary };

export interface GetAuditSummaryQuery extends IQuery {
  readonly workspaceId: string;
  readonly startDate: Date;
  readonly endDate: Date;
}

export class GetAuditSummaryHandler implements IQueryHandler<
  GetAuditSummaryQuery,
  AuditSummary
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(query: GetAuditSummaryQuery): Promise<AuditSummary> {
    return this.auditService.getAuditSummary(
      query.workspaceId,
      query.startDate,
      query.endDate
    );
  }
}
