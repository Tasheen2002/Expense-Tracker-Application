import { PolicyService } from '../services/policy.service';
import { OperationService } from '@shared/services/operation.service';
import {
  ExpensePolicyDTO,
  PolicyConfiguration,
} from '../../domain/entities/expense-policy.entity';
import { PolicyType } from '../../domain/enums/policy-type.enum';
import { ViolationSeverity } from '../../domain/enums/violation-severity.enum';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface CreatePolicyCommand extends ICommand {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly description?: string;
  readonly policyType: PolicyType;
  readonly severity: ViolationSeverity;
  readonly configuration: PolicyConfiguration;
  readonly priority?: number;
  readonly createdBy?: string;
  readonly authToken?: string;
}

export type CreatePolicyInput = CreatePolicyCommand;

export class CreatePolicyHandler implements ICommandHandler<CreatePolicyCommand, CommandResult<ExpensePolicyDTO>> {
  constructor(
    private readonly policyService: PolicyService,
    private readonly operations: OperationService
  ) {}

  async handle(
    command: CreatePolicyCommand
  ): Promise<CommandResult<ExpensePolicyDTO>> {
    const actorId = command.actorId ?? command.createdBy!;
    const dto = await this.operations.execute(
      {
        actorId,
        workspaceId: command.workspaceId,
        role: 'ADMIN',
        authToken: command.authToken,
      },
      async () =>
        this.policyService.createPolicy({
          workspaceId: command.workspaceId,
          name: command.name,
          description: command.description,
          policyType: command.policyType,
          severity: command.severity,
          configuration: command.configuration,
          priority: command.priority,
          createdBy: actorId,
        })
    );
    return CommandResult.success(dto);
  }
}
