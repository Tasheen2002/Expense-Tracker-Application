import { ViolationService } from '../services/violation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { OperationService } from '../../../../shared/services/operation.service';
import { UnauthorizedViolationActionError } from '../../domain/errors/policy-controls.errors';
import { UnauthorizedWorkspaceAccessError } from '../../../../shared/errors/workspace-authorization.error';

export interface GetViolationInput extends IQuery {
  readonly actorId: string;
  readonly violationId: string;
  readonly workspaceId: string;
  readonly authToken?: string;
}

export class GetViolationHandler implements IQueryHandler<GetViolationInput, PolicyViolationDTO> {
  constructor(
    private readonly violationService: ViolationService,
    private readonly operations: OperationService
  ) {}

  async handle(input: GetViolationInput): Promise<PolicyViolationDTO> {
    if (!input.actorId) {
      throw new UnauthorizedWorkspaceAccessError('Actor ID is required for query authorization');
    }

    const membership = await this.operations.authorize({
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      authToken: input.authToken,
    });

    const violation = await this.violationService.getViolation(input.violationId, input.workspaceId);

    const role = membership.role.toUpperCase();
    const isElevated = ['ADMIN', 'OWNER', 'FINANCE_APPROVER', 'AUDITOR', 'SYSTEM'].includes(role);

    if (!isElevated && violation.userId.toLowerCase() !== input.actorId.toLowerCase()) {
      throw new UnauthorizedViolationActionError(input.actorId, 'view');
    }

    return violation;
  }
}
