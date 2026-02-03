import { PolicyRepository } from "../../domain/repositories/policy.repository";
import { ExpensePolicy } from "../../domain/entities/expense-policy.entity";
import { PolicyId } from "../../domain/value-objects/policy-id";
import { PolicyNotFoundError } from "../../domain/errors/policy-controls.errors";

export interface ActivatePolicyInput {
  policyId: string;
}

export class ActivatePolicyHandler {
  constructor(private readonly policyRepository: PolicyRepository) {}

  async handle(input: ActivatePolicyInput): Promise<ExpensePolicy> {
    const policy = await this.policyRepository.findById(
      PolicyId.fromString(input.policyId),
    );
    if (!policy) {
      throw new PolicyNotFoundError(input.policyId);
    }

    policy.activate();
    await this.policyRepository.save(policy);

    return policy;
  }
}
