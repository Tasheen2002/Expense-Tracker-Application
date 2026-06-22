import { PolicyService } from '../services/policy.service';
import { ExpensePolicyDTO } from '../../domain/entities/expense-policy.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface DeactivatePolicyInput extends ICommand {
  readonly policyId: string;
  readonly workspaceId: string;
}

export class DeactivatePolicyHandler implements ICommandHandler<DeactivatePolicyInput, CommandResult<ExpensePolicyDTO>> {
  constructor(private readonly policyService: PolicyService) {}

  async handle(input: DeactivatePolicyInput): Promise<CommandResult<ExpensePolicyDTO>> {
    const dto = await this.policyService.deactivatePolicy(input.policyId, input.workspaceId);
    return CommandResult.success(dto);
  }
}
