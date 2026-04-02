import { ApprovalChainService } from '../services/approval-chain.service';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface ActivateApprovalChainInput extends ICommand {
  chainId: string;
  workspaceId: string;
}

export class ActivateApprovalChainHandler implements ICommandHandler<
  ActivateApprovalChainInput,
  CommandResult<void>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  async handle(
    input: ActivateApprovalChainInput
  ): Promise<CommandResult<void>> {
    try {
      await this.approvalChainService.activateChain(
        input.chainId,
        input.workspaceId
      );
      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
