import { PolicyRepository } from "../../domain/repositories/policy.repository";
import { PolicyId } from "../../domain/value-objects/policy-id";
import { PolicyNotFoundError } from "../../domain/errors/policy-controls.errors";

export interface DeletePolicyInput {
  policyId: string;
}

export class DeletePolicyHandler {
  constructor(private readonly policyRepository: PolicyRepository) {}

  async handle(input: DeletePolicyInput): Promise<void> {
    const policyId = PolicyId.fromString(input.policyId);
    const policy = await this.policyRepository.findById(policyId);
    if (!policy) {
      throw new PolicyNotFoundError(input.policyId);
    }

    await this.policyRepository.delete(policyId);
  }
}
