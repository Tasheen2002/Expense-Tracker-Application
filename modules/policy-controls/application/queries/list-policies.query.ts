import { PolicyService } from '../services/policy.service';
import { ExpensePolicyDTO } from '../../domain/entities/expense-policy.entity';
import { PolicyType } from '../../domain/enums/policy-type.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface ListPoliciesInput {
  workspaceId: string;
  activeOnly?: boolean;
  policyType?: PolicyType;
  pagination?: PaginationOptions;
}

export class ListPoliciesHandler {
  constructor(private readonly policyService: PolicyService) {}

  async handle(
    input: ListPoliciesInput
  ): Promise<QueryResult<PaginatedResult<ExpensePolicyDTO>>> {
    const result = await this.policyService.listPolicies(
      input.workspaceId,
      input.activeOnly,
      input.pagination
    );
    return QueryResult.success(result);
  }
}
