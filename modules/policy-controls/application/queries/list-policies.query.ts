import { PolicyService } from '../services/policy.service';
import { ExpensePolicyDTO } from '../../domain/entities/expense-policy.entity';
import { PolicyType } from '../../domain/enums/policy-type.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { IQuery, IQueryHandler } from '@core/application/cqrs';

export interface ListPoliciesInput extends IQuery {
  readonly workspaceId: string;
  readonly activeOnly?: boolean;
  readonly policyType?: PolicyType;
  readonly pagination?: PaginationOptions;
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
