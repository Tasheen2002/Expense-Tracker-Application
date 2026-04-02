import { PolicyRepository } from '../../domain/repositories/policy.repository';
import {
  ExpensePolicy,
  PolicyConfiguration,
} from '../../domain/entities/expense-policy.entity';
import { PolicyType } from '../../domain/enums/policy-type.enum';
import { ViolationSeverity } from '../../domain/enums/violation-severity.enum';
import { PolicyNameAlreadyExistsError } from '../../domain/errors/policy-controls.errors';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface CreatePolicyInput {
  workspaceId: string;
  name: string;
  description?: string;
  policyType: PolicyType;
  severity: ViolationSeverity;
  configuration: PolicyConfiguration;
  priority?: number;
  createdBy: string;
}

export class CreatePolicyHandler {
  constructor(private readonly policyRepository: PolicyRepository) {}

  async handle(
    input: CreatePolicyInput
  ): Promise<CommandResult<{ policyId: string }>> {
    const existingPolicy = await this.policyRepository.findByNameInWorkspace(
      input.workspaceId,
      input.name
    );
    if (existingPolicy) {
      throw new PolicyNameAlreadyExistsError(input.name, input.workspaceId);
    }

    const policy = ExpensePolicy.create({
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      policyType: input.policyType,
      severity: input.severity,
      configuration: input.configuration,
      priority: input.priority ?? 0,
      createdBy: input.createdBy,
    });

    await this.policyRepository.save(policy);

    return CommandResult.success({ policyId: policy.getId().getValue() });
  }
}
