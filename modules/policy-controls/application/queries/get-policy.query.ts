import { PolicyRepository } from "../../domain/repositories/policy.repository";
import { ExpensePolicy } from "../../domain/entities/expense-policy.entity";
import { PolicyId } from "../../domain/value-objects/policy-id";

export interface GetPolicyInput {
  policyId: string;
}

export class GetPolicyHandler {
  constructor(private readonly policyRepository: PolicyRepository) {}

  async handle(input: GetPolicyInput): Promise<ExpensePolicy | null> {
    return this.policyRepository.findById(PolicyId.fromString(input.policyId));
  }
}
