import { ViolationRepository } from "../../domain/repositories/violation.repository";
import { ViolationStatus } from "../../domain/enums/violation-status.enum";
import { ViolationSeverity } from "../../domain/enums/violation-severity.enum";

export interface GetViolationStatsInput {
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

export class GetViolationStatsHandler {
  constructor(private readonly violationRepository: ViolationRepository) {}

  async handle(input: GetViolationStatsInput): Promise<ViolationStatsResult> {
    const result = await this.violationRepository.findByWorkspace(
      input.workspaceId,
      { startDate: input.startDate, endDate: input.endDate },
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
      byStatus[violation.getStatus()]++;
      bySeverity[violation.getSeverity()]++;
    }

    return {
      total: result.total,
      byStatus,
      bySeverity,
      pendingCount: byStatus[ViolationStatus.PENDING],
      resolvedCount: byStatus[ViolationStatus.RESOLVED],
    };
  }
}
