import { PolicyService } from '../services/policy.service';
import { ExpensePolicyDTO } from '../../domain/entities/expense-policy.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetPolicyInput extends IQuery {
  policyId: string;
  workspaceId: string;
}

export class GetPolicyHandler implements IQueryHandler<GetPolicyInput, ExpensePolicyDTO> {
  constructor(private readonly policyService: PolicyService) {}

  async handle(input: GetPolicyInput): Promise<ExpensePolicyDTO> {
    return this.policyService.getPolicy(input.policyId, input.workspaceId);
  }
}
