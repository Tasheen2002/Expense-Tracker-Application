import { PolicyRepository } from "../../domain/repositories/policy.repository";
import { ExpensePolicy } from "../../domain/entities/expense-policy.entity";
import { PolicyType } from "../../domain/enums/policy-type.enum";

export interface ListPoliciesInput {
  workspaceId: string;
  activeOnly?: boolean;
  policyType?: PolicyType;
}

export class ListPoliciesHandler {
  constructor(private readonly policyRepository: PolicyRepository) {}

  async handle(input: ListPoliciesInput): Promise<ExpensePolicy[]> {
    if (input.activeOnly) {
      return this.policyRepository.findActiveByWorkspace(input.workspaceId);
    }

    return this.policyRepository.findByWorkspace(input.workspaceId);
  }
}
