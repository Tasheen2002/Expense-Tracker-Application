import { ViolationService } from '../services/violation.service';
import { ViolationStatus } from '../../domain/enums/violation-status.enum';
import { ViolationSeverity } from '../../domain/enums/violation-severity.enum';
import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { OperationService } from '../../../../shared/services/operation.service';
import { UnauthorizedViolationActionError } from '../../domain/errors/policy-controls.errors';
import { UnauthorizedWorkspaceAccessError } from '../../../../shared/errors/workspace-authorization.error';

export interface GetViolationStatsInput extends IQuery {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly authToken?: string;
}

export interface ViolationStatsResult {
  total: number;
  byStatus: Record<ViolationStatus, number>;
  bySeverity: Record<ViolationSeverity, number>;
  pendingCount: number;
  resolvedCount: number;
}

export class GetViolationStatsHandler implements IQueryHandler<GetViolationStatsInput, ViolationStatsResult> {
  constructor(
    private readonly violationService: ViolationService,
    private readonly operations: OperationService
  ) {}

  async handle(input: GetViolationStatsInput): Promise<ViolationStatsResult> {
    if (!input.actorId) {
      throw new UnauthorizedWorkspaceAccessError('Actor ID is required for query authorization');
    }

    const membership = await this.operations.authorize({
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      authToken: input.authToken,
    });

    const role = membership.role.toUpperCase();
    const isElevated = ['ADMIN', 'OWNER', 'FINANCE_APPROVER', 'AUDITOR', 'SYSTEM'].includes(role);

    if (!isElevated) {
      throw new UnauthorizedViolationActionError(input.actorId, 'view organization-wide violation statistics');
    }

    const stats = await this.violationService.getStats(input.workspaceId, {
      startDate: input.startDate,
      endDate: input.endDate,
    });

    return {
      total: stats.total,
      byStatus: stats.byStatus,
      bySeverity: stats.bySeverity,
      pendingCount: stats.byStatus[ViolationStatus.PENDING] ?? 0,
      resolvedCount: stats.byStatus[ViolationStatus.RESOLVED] ?? 0,
    };
  }
}
