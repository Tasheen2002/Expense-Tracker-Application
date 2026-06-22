import { PolicyService } from '../services/policy.service';
import { ExpensePolicyDTO } from '../../domain/entities/expense-policy.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface ActivatePolicyInput extends ICommand {
  readonly policyId: string;
  readonly workspaceId: string;
}

export class ActivatePolicyHandler implements ICommandHandler<ActivatePolicyInput, CommandResult<ExpensePolicyDTO>> {
  constructor(private readonly policyService: PolicyService) {}

  async handle(input: ActivatePolicyInput): Promise<CommandResult<ExpensePolicyDTO>> {
    const dto = await this.policyService.activatePolicy(input.policyId, input.workspaceId);
    return CommandResult.success(dto);
  }
}
