import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { IAuditLogRepository } from '../../domain/repositories/audit-log.repository';

export interface AuditSummary {
  totalLogs: number;
  actionBreakdown: { action: string; count: number }[];
  period: { startDate: Date; endDate: Date };
}

export interface GetAuditSummaryQuery extends IQuery {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
}

export class GetAuditSummaryHandler implements IQueryHandler<
  GetAuditSummaryQuery,
  QueryResult<AuditSummary>
> {
  constructor(private readonly auditRepository: IAuditLogRepository) {}

  async handle(
    input: GetAuditSummaryQuery
  ): Promise<QueryResult<AuditSummary>> {
    try {
      const [totalLogs, actionBreakdown] = await Promise.all([
        this.auditRepository.countByWorkspace(input.workspaceId),
        this.auditRepository.getActionSummary(input.workspaceId, input.startDate, input.endDate),
      ]);

      return QueryResult.success({
        totalLogs,
        actionBreakdown,
        period: { startDate: input.startDate, endDate: input.endDate },
      });
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
