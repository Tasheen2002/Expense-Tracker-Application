import { PolicyRepository } from '../../domain/repositories/policy.repository';
import { ExpensePolicy } from '../../domain/entities/expense-policy.entity';
import { PolicyId } from '../../domain/value-objects/policy-id';
import { PolicyNotFoundError } from '../../domain/errors/policy-controls.errors';
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
  QueryResult<ExpensePolicy>
> {
  constructor(private readonly policyRepository: PolicyRepository) {}

  async handle(input: GetPolicyInput): Promise<QueryResult<ExpensePolicy>> {
    try {
      const policy = await this.policyRepository.findById(
        PolicyId.fromString(input.policyId)
      );
      if (!policy || policy.getWorkspaceId().getValue() !== input.workspaceId) {
        throw new PolicyNotFoundError(input.policyId);
      }
      return QueryResult.success(policy);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
