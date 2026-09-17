import { PolicyService } from '../services/policy.service';
import { OperationService } from '@shared/services/operation.service';
import { ExpensePolicyDTO } from '../../domain/entities/expense-policy.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface DeactivatePolicyCommand extends ICommand {
  readonly actorId: string;
  readonly policyId: string;
  readonly workspaceId: string;
  readonly authToken?: string;
}

export type DeactivatePolicyInput = DeactivatePolicyCommand;

export class DeactivatePolicyHandler implements ICommandHandler<DeactivatePolicyCommand, CommandResult<ExpensePolicyDTO>> {
  constructor(
    private readonly policyService: PolicyService,
    private readonly operations: OperationService
  ) {}

  async handle(command: DeactivatePolicyCommand): Promise<CommandResult<ExpensePolicyDTO>> {
    const dto = await this.operations.execute(
      {
        actorId: command.actorId,
        workspaceId: command.workspaceId,
        role: 'ADMIN',
        authToken: command.authToken,
      },
      async () => this.policyService.deactivatePolicy(command.policyId, command.workspaceId)
    );
    return CommandResult.success(dto);
  }
}
