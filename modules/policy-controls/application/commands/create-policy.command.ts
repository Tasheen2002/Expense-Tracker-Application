import { PolicyService } from '../services/policy.service';
import {
  ExpensePolicyDTO,
  PolicyConfiguration,
} from '../../domain/entities/expense-policy.entity';
import { PolicyType } from '../../domain/enums/policy-type.enum';
import { ViolationSeverity } from '../../domain/enums/violation-severity.enum';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface CreatePolicyInput {
  workspaceId: string;
  name: string;
  description?: string;
  policyType: PolicyType;
  severity: ViolationSeverity;
  configuration: PolicyConfiguration;
  priority?: number;
  createdBy: string;
}

export class CreatePolicyHandler {
  constructor(private readonly policyService: PolicyService) {}

  async handle(
    input: CreatePolicyInput
  ): Promise<CommandResult<ExpensePolicyDTO>> {
    const dto = await this.policyService.createPolicy(input);
    return CommandResult.success(dto);
  }
}
