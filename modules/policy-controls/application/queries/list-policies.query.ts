import { PolicyRepository } from "../../domain/repositories/policy.repository";
import { ExpensePolicy } from "../../domain/entities/expense-policy.entity";
import { PolicyType } from "../../domain/enums/policy-type.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface ListPoliciesInput {
  workspaceId: string;
  activeOnly?: boolean;
  policyType?: PolicyType;
  pagination?: PaginationOptions;
}

export class ListPoliciesHandler {
  constructor(private readonly policyRepository: PolicyRepository) {}

  async handle(input: ListPoliciesInput): Promise<PaginatedResult<ExpensePolicy>> {
    if (input.activeOnly) {
      return this.policyRepository.findActiveByWorkspace(input.workspaceId, input.pagination);
    }

    return this.policyRepository.findByWorkspace(input.workspaceId, input.pagination);
  }
}
