import { PolicyRepository } from "../../domain/repositories/policy.repository";
import {
  ExpensePolicy,
  PolicyConfiguration,
} from "../../domain/entities/expense-policy.entity";
import { PolicyId } from "../../domain/value-objects/policy-id";
import { PolicyNotFoundError } from "../../domain/errors/policy-controls.errors";
import { ViolationSeverity } from "../../domain/enums/violation-severity.enum";

export interface UpdatePolicyInput {
  policyId: string;
  name?: string;
  description?: string;
  severity?: ViolationSeverity;
  configuration?: PolicyConfiguration;
  priority?: number;
}

export class UpdatePolicyHandler {
  constructor(private readonly policyRepository: PolicyRepository) {}

  async handle(input: UpdatePolicyInput): Promise<ExpensePolicy> {
    const policy = await this.policyRepository.findById(
      PolicyId.fromString(input.policyId),
    );
    if (!policy) {
      throw new PolicyNotFoundError(input.policyId);
    }

    if (input.name) {
      policy.updateName(input.name);
    }
    if (input.description !== undefined) {
      policy.updateDescription(input.description);
    }
    if (input.severity) {
      policy.updateSeverity(input.severity);
    }
    if (input.configuration) {
      policy.updateConfiguration(input.configuration);
    }
    if (input.priority !== undefined) {
      policy.updatePriority(input.priority);
    }

    await this.policyRepository.save(policy);

    return policy;
  }
}
