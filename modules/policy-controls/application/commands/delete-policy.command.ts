import { PolicyRepository } from '../../domain/repositories/policy.repository';
import { PolicyId } from '../../domain/value-objects/policy-id';
import { PolicyNotFoundError } from '../../domain/errors/policy-controls.errors';
import { CommandResult } from '../../../../apps/api/src/shared/application/command-result';

export interface DeletePolicyInput {
  policyId: string;
  workspaceId: string;
}

export class DeletePolicyHandler {
  constructor(private readonly policyRepository: PolicyRepository) {}

  async handle(input: DeletePolicyInput): Promise<CommandResult<void>> {
    const policyId = PolicyId.fromString(input.policyId);
    const policy = await this.policyRepository.findById(policyId);
    if (!policy || policy.getWorkspaceId().getValue() !== input.workspaceId) {
      throw new PolicyNotFoundError(input.policyId);
    }

    await this.policyRepository.delete(policyId);
    return CommandResult.success();
  }
}
