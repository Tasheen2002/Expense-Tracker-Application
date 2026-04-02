import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { AuditService, AuditSummary } from '../services/audit.service';

export interface GetAuditSummaryQuery extends IQuery {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
}

export class GetAuditSummaryHandler implements IQueryHandler<
  GetAuditSummaryQuery,
  QueryResult<AuditSummary>
> {
  constructor(private readonly auditService: AuditService) {}

  async handle(
    input: GetAuditSummaryQuery
  ): Promise<QueryResult<AuditSummary>> {
    try {
      const summary = await this.auditService.getAuditSummary(
        input.workspaceId,
        input.startDate,
        input.endDate
      );
      return QueryResult.success(summary);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
