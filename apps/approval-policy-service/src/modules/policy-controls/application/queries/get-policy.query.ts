import { PolicyService } from '../services/policy.service';
import { ExpensePolicyDTO } from '../../domain/entities/expense-policy.entity';
import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { OperationService } from '../../../../shared/services/operation.service';
import { UnauthorizedWorkspaceAccessError } from '../../../../shared/errors/workspace-authorization.error';

export interface GetPolicyInput extends IQuery {
  readonly actorId: string;
  readonly policyId: string;
  readonly workspaceId: string;
  readonly authToken?: string;
}

export class GetPolicyHandler implements IQueryHandler<GetPolicyInput, ExpensePolicyDTO> {
  constructor(
    private readonly policyService: PolicyService,
    private readonly operations: OperationService
  ) {}

  async handle(input: GetPolicyInput): Promise<ExpensePolicyDTO> {
    if (!input.actorId) {
      throw new UnauthorizedWorkspaceAccessError('Actor ID is required for query authorization');
    }

    await this.operations.authorize({
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      authToken: input.authToken,
    });

    return this.policyService.getPolicy(input.policyId, input.workspaceId);
  }
}
