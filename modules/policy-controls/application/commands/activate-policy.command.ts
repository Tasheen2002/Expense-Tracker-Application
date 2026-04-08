import { PolicyService } from '../services/policy.service';
import { ExpensePolicyDTO } from '../../domain/entities/expense-policy.entity';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface ActivatePolicyInput {
  policyId: string;
  workspaceId: string;
}

export class ActivatePolicyHandler {
  constructor(private readonly policyService: PolicyService) {}

  async handle(input: ActivatePolicyInput): Promise<CommandResult<ExpensePolicyDTO>> {
    const dto = await this.policyService.activatePolicy(input.policyId, input.workspaceId);
    return CommandResult.success(dto);
  }
}
