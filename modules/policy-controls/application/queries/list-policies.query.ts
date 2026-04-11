import { PolicyService } from '../services/policy.service';
import { ExpensePolicyDTO } from '../../domain/entities/expense-policy.entity';
import { PolicyType } from '../../domain/enums/policy-type.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';

export interface ListPoliciesInput extends IQuery {
  workspaceId: string;
  activeOnly?: boolean;
  policyType?: PolicyType;
  pagination?: PaginationOptions;
}

export class ListPoliciesHandler implements IQueryHandler<ListPoliciesInput, PaginatedResult<ExpensePolicyDTO>> {
  constructor(private readonly policyService: PolicyService) {}

  async handle(input: ListPoliciesInput): Promise<PaginatedResult<ExpensePolicyDTO>> {
    return this.policyService.listPolicies(
      input.workspaceId,
      input.activeOnly,
      input.pagination
    );
  }
}
