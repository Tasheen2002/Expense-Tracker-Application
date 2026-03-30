import { PolicyRepository } from '../../domain/repositories/policy.repository';
import { ExpensePolicy } from '../../domain/entities/expense-policy.entity';
import { PolicyType } from '../../domain/enums/policy-type.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import { QueryResult } from '../../../../apps/api/src/shared/application/query-result';

export interface ListPoliciesInput {
  workspaceId: string;
  activeOnly?: boolean;
  policyType?: PolicyType;
  pagination?: PaginationOptions;
}

export class ListPoliciesHandler {
  constructor(private readonly policyRepository: PolicyRepository) {}

  async handle(
    input: ListPoliciesInput
  ): Promise<QueryResult<PaginatedResult<ExpensePolicy>>> {
    let result: PaginatedResult<ExpensePolicy>;
    if (input.activeOnly) {
      result = await this.policyRepository.findActiveByWorkspace(
        input.workspaceId,
        input.pagination
      );
    } else {
      result = await this.policyRepository.findByWorkspace(
        input.workspaceId,
        input.pagination
      );
    }
    return QueryResult.success(result);
  }
}
