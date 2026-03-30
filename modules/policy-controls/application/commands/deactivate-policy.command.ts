import { PolicyRepository } from '../../domain/repositories/policy.repository';
import { ExpensePolicy } from '../../domain/entities/expense-policy.entity';
import { PolicyId } from '../../domain/value-objects/policy-id';
import { PolicyNotFoundError } from '../../domain/errors/policy-controls.errors';
import { CommandResult } from '../../../../apps/api/src/shared/application/command-result';

export interface DeactivatePolicyInput {
  policyId: string;
  workspaceId: string;
}

export class DeactivatePolicyHandler {
  constructor(private readonly policyRepository: PolicyRepository) {}

  async handle(input: DeactivatePolicyInput): Promise<CommandResult<void>> {
    const policy = await this.policyRepository.findById(
      PolicyId.fromString(input.policyId)
    );
    if (!policy || policy.getWorkspaceId().getValue() !== input.workspaceId) {
      throw new PolicyNotFoundError(input.policyId);
    }

    policy.deactivate();
    await this.policyRepository.save(policy);

    return CommandResult.success();
  }
}
