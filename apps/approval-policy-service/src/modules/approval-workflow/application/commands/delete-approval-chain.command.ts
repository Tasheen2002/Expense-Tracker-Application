import { ApprovalChainService } from '../services/approval-chain.service';
import {
  ICommand,
  ICommandHandler,
} from '@core/application/cqrs';
import { CommandResult } from '@core/application/command-result';

export interface DeleteApprovalChainCommand extends ICommand {
  readonly chainId: string;
  readonly workspaceId: string;
}

export class DeleteApprovalChainHandler implements ICommandHandler<
  DeleteApprovalChainCommand,
  CommandResult<void>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  async handle(command: DeleteApprovalChainCommand): Promise<CommandResult<void>> {
    await this.approvalChainService.deleteChain(
      command.chainId,
      command.workspaceId
    );
    return CommandResult.success();
  }
}
