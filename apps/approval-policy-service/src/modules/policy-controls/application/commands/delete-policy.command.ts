import { PolicyService } from '../services/policy.service';
import { OperationService } from '@shared/services/operation.service';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface DeletePolicyCommand extends ICommand {
  readonly actorId: string;
  readonly policyId: string;
  readonly workspaceId: string;
  readonly authToken?: string;
}

export type DeletePolicyInput = DeletePolicyCommand;

export class DeletePolicyHandler implements ICommandHandler<DeletePolicyCommand, CommandResult<void>> {
  constructor(
    private readonly policyService: PolicyService,
    private readonly operations: OperationService
  ) {}

  async handle(command: DeletePolicyCommand): Promise<CommandResult<void>> {
    await this.operations.execute(
      {
        actorId: command.actorId,
        workspaceId: command.workspaceId,
        role: 'ADMIN',
        authToken: command.authToken,
      },
      async () => this.policyService.deletePolicy(command.policyId, command.workspaceId)
    );
    return CommandResult.success();
  }
}
