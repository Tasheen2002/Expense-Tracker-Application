import { ExemptionService } from '../services/exemption.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { OperationService } from '../../../../shared/services/operation.service';
import { UnauthorizedWorkspaceAccessError } from '../../../../shared/errors/workspace-authorization.error';

export interface CheckActiveExemptionInput extends IQuery {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly policyId: string;
  readonly authToken?: string;
}

export class CheckActiveExemptionHandler implements IQueryHandler<CheckActiveExemptionInput, PolicyExemptionDTO | null> {
  constructor(
    private readonly exemptionService: ExemptionService,
    private readonly operations: OperationService
  ) {}

  async handle(input: CheckActiveExemptionInput): Promise<PolicyExemptionDTO | null> {
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

    if (!isElevated && input.userId.toLowerCase() !== input.actorId.toLowerCase()) {
      throw new UnauthorizedWorkspaceAccessError('You can only check active exemptions for yourself');
    }

    return this.exemptionService.checkActiveExemption(
      input.workspaceId,
      input.userId,
      input.policyId
    );
  }
}
