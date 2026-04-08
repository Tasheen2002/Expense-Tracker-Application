import { ApprovalChainService } from '../services/approval-chain.service';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface DeleteApprovalChainInput extends ICommand {
  chainId: string;
  workspaceId: string;
}

export class DeleteApprovalChainHandler implements ICommandHandler<
  DeleteApprovalChainInput,
  CommandResult<void>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  async handle(input: DeleteApprovalChainInput): Promise<CommandResult<void>> {
    await this.approvalChainService.deleteChain(
      input.chainId,
      input.workspaceId
    );
    return CommandResult.success();
  }
}
