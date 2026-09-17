import { ExemptionService } from '../services/exemption.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { OperationService } from '../../../../shared/services/operation.service';
import { UnauthorizedWorkspaceAccessError } from '../../../../shared/errors/workspace-authorization.error';

export interface GetExemptionInput extends IQuery {
  readonly actorId: string;
  readonly exemptionId: string;
  readonly workspaceId: string;
  readonly authToken?: string;
}

export class GetExemptionHandler implements IQueryHandler<GetExemptionInput, PolicyExemptionDTO> {
  constructor(
    private readonly exemptionService: ExemptionService,
    private readonly operations: OperationService
  ) {}

  async handle(input: GetExemptionInput): Promise<PolicyExemptionDTO> {
    if (!input.actorId) {
      throw new UnauthorizedWorkspaceAccessError('Actor ID is required for query authorization');
    }

    const membership = await this.operations.authorize({
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      authToken: input.authToken,
    });

    const exemption = await this.exemptionService.getExemption(input.exemptionId, input.workspaceId);

    const role = membership.role.toUpperCase();
    const isElevated = ['ADMIN', 'OWNER', 'FINANCE_APPROVER', 'AUDITOR', 'SYSTEM'].includes(role);
    const isOwner =
      (Boolean(exemption.userId) && exemption.userId.toLowerCase() === input.actorId.toLowerCase()) ||
      (Boolean(exemption.requestedBy) && exemption.requestedBy.toLowerCase() === input.actorId.toLowerCase());

    if (!isElevated && !isOwner) {
      throw new UnauthorizedWorkspaceAccessError('You are not authorized to view this exemption');
    }

    return exemption;
  }
}
