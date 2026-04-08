import { ViolationService } from '../services/violation.service';
import { ViolationStatus } from '../../domain/enums/violation-status.enum';
import { ViolationSeverity } from '../../domain/enums/violation-severity.enum';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
export interface GetViolationStatsInput extends IQuery {
  workspaceId: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ViolationStatsResult {
  total: number;
  byStatus: Record<ViolationStatus, number>;
  bySeverity: Record<ViolationSeverity, number>;
  pendingCount: number;
  resolvedCount: number;
}

export class GetViolationStatsHandler implements IQueryHandler<
  GetViolationStatsInput,
  QueryResult<ViolationStatsResult>
> {
  constructor(private readonly violationService: ViolationService) {}

  async handle(
    input: GetViolationStatsInput
  ): Promise<QueryResult<ViolationStatsResult>> {
    const result = await this.violationService.listViolations(
      input.workspaceId,
      { startDate: input.startDate, endDate: input.endDate }
    );

    const violations = result.items;

    const byStatus: Record<ViolationStatus, number> = {
      [ViolationStatus.PENDING]: 0,
      [ViolationStatus.ACKNOWLEDGED]: 0,
      [ViolationStatus.RESOLVED]: 0,
      [ViolationStatus.EXEMPTED]: 0,
      [ViolationStatus.OVERRIDDEN]: 0,
    };

    const bySeverity: Record<ViolationSeverity, number> = {
      [ViolationSeverity.LOW]: 0,
      [ViolationSeverity.MEDIUM]: 0,
      [ViolationSeverity.HIGH]: 0,
      [ViolationSeverity.CRITICAL]: 0,
    };

    for (const violation of violations) {
      byStatus[violation.status]++;
      bySeverity[violation.severity]++;
    }

    return QueryResult.success({
      total: result.total,
      byStatus,
      bySeverity,
      pendingCount: byStatus[ViolationStatus.PENDING],
      resolvedCount: byStatus[ViolationStatus.RESOLVED],
    });
  }
}
