import { PolicyService } from '../services/policy.service';
import { OperationService } from '@shared/services/operation.service';
import {
  ExpensePolicyDTO,
  PolicyConfiguration,
} from '../../domain/entities/expense-policy.entity';
import { ViolationSeverity } from '../../domain/enums/violation-severity.enum';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface UpdatePolicyCommand extends ICommand {
  readonly actorId: string;
  readonly policyId: string;
  readonly workspaceId: string;
  readonly name?: string;
  readonly description?: string;
  readonly severity?: ViolationSeverity;
  readonly configuration?: PolicyConfiguration;
  readonly priority?: number;
  readonly authToken?: string;
}

export type UpdatePolicyInput = UpdatePolicyCommand;

export class UpdatePolicyHandler implements ICommandHandler<UpdatePolicyCommand, CommandResult<ExpensePolicyDTO>> {
  constructor(
    private readonly policyService: PolicyService,
    private readonly operations: OperationService
  ) {}

  async handle(command: UpdatePolicyCommand): Promise<CommandResult<ExpensePolicyDTO>> {
    const dto = await this.operations.execute(
      {
        actorId: command.actorId,
        workspaceId: command.workspaceId,
        role: 'ADMIN',
        authToken: command.authToken,
      },
      async () => this.policyService.updatePolicy(command)
    );
    return CommandResult.success(dto);
  }
}
