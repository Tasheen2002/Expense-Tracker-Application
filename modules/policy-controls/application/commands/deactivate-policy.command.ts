import { PolicyService } from '../services/policy.service';
import { ExpensePolicyDTO } from '../../domain/entities/expense-policy.entity';
import { ICommand, ICommandHandler } from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface DeactivatePolicyInput extends ICommand {
  policyId: string;
  workspaceId: string;
}

export class DeactivatePolicyHandler implements ICommandHandler<DeactivatePolicyInput, CommandResult<ExpensePolicyDTO>> {
  constructor(private readonly policyService: PolicyService) {}

  async handle(input: DeactivatePolicyInput): Promise<CommandResult<ExpensePolicyDTO>> {
    const dto = await this.policyService.deactivatePolicy(input.policyId, input.workspaceId);
    return CommandResult.success(dto);
  }
}
