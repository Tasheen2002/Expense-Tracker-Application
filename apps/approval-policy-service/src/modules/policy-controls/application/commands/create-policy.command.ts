import { PolicyService } from '../services/policy.service';
import {
  ExpensePolicyDTO,
  PolicyConfiguration,
} from '../../domain/entities/expense-policy.entity';
import { PolicyType } from '../../domain/enums/policy-type.enum';
import { ViolationSeverity } from '../../domain/enums/violation-severity.enum';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface CreatePolicyInput extends ICommand {
  readonly workspaceId: string;
  readonly name: string;
  readonly description?: string;
  readonly policyType: PolicyType;
  readonly severity: ViolationSeverity;
  readonly configuration: PolicyConfiguration;
  readonly priority?: number;
  readonly createdBy: string;
}

export class CreatePolicyHandler implements ICommandHandler<CreatePolicyInput, CommandResult<ExpensePolicyDTO>> {
  constructor(private readonly policyService: PolicyService) {}

  async handle(
    input: CreatePolicyInput
  ): Promise<CommandResult<ExpensePolicyDTO>> {
    const dto = await this.policyService.createPolicy(input);
    return CommandResult.success(dto);
  }
}
