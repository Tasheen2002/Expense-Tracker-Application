import { PolicyService } from '../services/policy.service';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface DeletePolicyInput {
  policyId: string;
  workspaceId: string;
}

export class DeletePolicyHandler {
  constructor(private readonly policyService: PolicyService) {}

  async handle(input: DeletePolicyInput): Promise<CommandResult<void>> {
    await this.policyService.deletePolicy(input.policyId, input.workspaceId);
    return CommandResult.success();
  }
}
