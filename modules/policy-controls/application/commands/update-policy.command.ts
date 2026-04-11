import { PolicyService } from '../services/policy.service';
import {
  ExpensePolicyDTO,
  PolicyConfiguration,
} from '../../domain/entities/expense-policy.entity';
import { ViolationSeverity } from '../../domain/enums/violation-severity.enum';
import { ICommand, ICommandHandler } from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface UpdatePolicyInput extends ICommand {
  policyId: string;
  workspaceId: string;
  name?: string;
  description?: string;
  severity?: ViolationSeverity;
  configuration?: PolicyConfiguration;
  priority?: number;
}

export class UpdatePolicyHandler implements ICommandHandler<UpdatePolicyInput, CommandResult<ExpensePolicyDTO>> {
  constructor(private readonly policyService: PolicyService) {}

  async handle(input: UpdatePolicyInput): Promise<CommandResult<ExpensePolicyDTO>> {
    const dto = await this.policyService.updatePolicy(input);
    return CommandResult.success(dto);
  }
}
