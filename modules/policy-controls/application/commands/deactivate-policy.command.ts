import { PolicyService } from '../services/policy.service';
import { ExpensePolicyDTO } from '../../domain/entities/expense-policy.entity';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface DeactivatePolicyInput {
  policyId: string;
  workspaceId: string;
}

export class DeactivatePolicyHandler {
  constructor(private readonly policyService: PolicyService) {}

  async handle(input: DeactivatePolicyInput): Promise<CommandResult<ExpensePolicyDTO>> {
    const dto = await this.policyService.deactivatePolicy(input.policyId, input.workspaceId);
    return CommandResult.success(dto);
  }
}
