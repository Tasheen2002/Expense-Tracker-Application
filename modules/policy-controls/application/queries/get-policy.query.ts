import { PolicyService } from '../services/policy.service';
import { ExpensePolicyDTO } from '../../domain/entities/expense-policy.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
export interface GetPolicyInput extends IQuery {
  policyId: string;
  workspaceId: string;
}

export class GetPolicyHandler implements IQueryHandler<
  GetPolicyInput,
  QueryResult<ExpensePolicyDTO>
> {
  constructor(private readonly policyService: PolicyService) {}

  async handle(input: GetPolicyInput): Promise<QueryResult<ExpensePolicyDTO>> {
    const dto = await this.policyService.getPolicy(input.policyId, input.workspaceId);
    return QueryResult.success(dto);
  }
}
