import { PolicyService } from '../services/policy.service';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface DeletePolicyInput extends ICommand {
  readonly policyId: string;
  readonly workspaceId: string;
}

export class DeletePolicyHandler implements ICommandHandler<DeletePolicyInput, CommandResult<void>> {
  constructor(private readonly policyService: PolicyService) {}

  async handle(input: DeletePolicyInput): Promise<CommandResult<void>> {
    await this.policyService.deletePolicy(input.policyId, input.workspaceId);
    return CommandResult.success();
  }
}
