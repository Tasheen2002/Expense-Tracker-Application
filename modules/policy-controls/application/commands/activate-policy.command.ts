import { PolicyService } from '../services/policy.service';
import { ExpensePolicyDTO } from '../../domain/entities/expense-policy.entity';
import { ICommand, ICommandHandler } from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface ActivatePolicyInput extends ICommand {
  policyId: string;
  workspaceId: string;
}

export class ActivatePolicyHandler implements ICommandHandler<ActivatePolicyInput, CommandResult<ExpensePolicyDTO>> {
  constructor(private readonly policyService: PolicyService) {}

  async handle(input: ActivatePolicyInput): Promise<CommandResult<ExpensePolicyDTO>> {
    const dto = await this.policyService.activatePolicy(input.policyId, input.workspaceId);
    return CommandResult.success(dto);
  }
}
