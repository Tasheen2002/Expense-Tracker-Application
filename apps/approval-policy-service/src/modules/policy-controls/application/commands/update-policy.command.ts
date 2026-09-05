import { PolicyService } from '../services/policy.service';
import {
  ExpensePolicyDTO,
  PolicyConfiguration,
} from '../../domain/entities/expense-policy.entity';
import { ViolationSeverity } from '../../domain/enums/violation-severity.enum';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface UpdatePolicyInput extends ICommand {
  readonly policyId: string;
  readonly workspaceId: string;
  readonly name?: string;
  readonly description?: string;
  readonly severity?: ViolationSeverity;
  readonly configuration?: PolicyConfiguration;
  readonly priority?: number;
}

export class UpdatePolicyHandler implements ICommandHandler<UpdatePolicyInput, CommandResult<ExpensePolicyDTO>> {
  constructor(private readonly policyService: PolicyService) {}

  async handle(input: UpdatePolicyInput): Promise<CommandResult<ExpensePolicyDTO>> {
    const dto = await this.policyService.updatePolicy(input);
    return CommandResult.success(dto);
  }
}
