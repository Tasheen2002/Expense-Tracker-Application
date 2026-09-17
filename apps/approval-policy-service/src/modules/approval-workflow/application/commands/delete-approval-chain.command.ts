import { ApprovalChainService } from '../services/approval-chain.service';
import { OperationService } from '../services/operation.service';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface DeleteApprovalChainCommand extends ICommand {
  readonly actorId: string;
  readonly chainId: string;
  readonly workspaceId: string;
  readonly authToken?: string;
}

export class DeleteApprovalChainHandler implements ICommandHandler<
  DeleteApprovalChainCommand,
  CommandResult<void>
> {
  constructor(
    private readonly approvalChainService: ApprovalChainService,
    private readonly operations: OperationService
  ) {}

  async handle(command: DeleteApprovalChainCommand): Promise<CommandResult<void>> {
    await this.operations.execute(
      { actorId: command.actorId, workspaceId: command.workspaceId, role: 'ADMIN', authToken: command.authToken },
      async () => this.approvalChainService.deleteChain(command.chainId, command.workspaceId)
    );
    return CommandResult.success();
  }
}
