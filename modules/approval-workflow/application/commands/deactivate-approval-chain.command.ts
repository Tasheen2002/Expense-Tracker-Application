import { ApprovalChainService } from '../services/approval-chain.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface DeactivateApprovalChainCommand extends ICommand {
  readonly chainId: string;
  readonly workspaceId: string;
}

export class DeactivateApprovalChainHandler implements ICommandHandler<
  DeactivateApprovalChainCommand,
  CommandResult<ApprovalChainDTO>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  async handle(
    command: DeactivateApprovalChainCommand
  ): Promise<CommandResult<ApprovalChainDTO>> {
    const chain = await this.approvalChainService.deactivateChain(
      command.chainId,
      command.workspaceId
    );
    return CommandResult.success(chain);
  }
}
