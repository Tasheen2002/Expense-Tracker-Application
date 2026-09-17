import { PolicyService } from '../services/policy.service';
import { OperationService } from '@shared/services/operation.service';
import { ExpensePolicyDTO } from '../../domain/entities/expense-policy.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface ActivatePolicyCommand extends ICommand {
  readonly actorId: string;
  readonly policyId: string;
  readonly workspaceId: string;
  readonly authToken?: string;
}

export type ActivatePolicyInput = ActivatePolicyCommand;

export class ActivatePolicyHandler implements ICommandHandler<ActivatePolicyCommand, CommandResult<ExpensePolicyDTO>> {
  constructor(
    private readonly policyService: PolicyService,
    private readonly operations: OperationService
  ) {}

  async handle(command: ActivatePolicyCommand): Promise<CommandResult<ExpensePolicyDTO>> {
    const dto = await this.operations.execute(
      {
        actorId: command.actorId,
        workspaceId: command.workspaceId,
        role: 'ADMIN',
        authToken: command.authToken,
      },
      async () => this.policyService.activatePolicy(command.policyId, command.workspaceId)
    );
    return CommandResult.success(dto);
  }
}
