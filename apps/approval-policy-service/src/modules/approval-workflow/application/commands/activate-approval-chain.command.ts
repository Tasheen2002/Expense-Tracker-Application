import { ApprovalChainService } from '../services/approval-chain.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import {
  ICommand,
  ICommandHandler,
} from '@core/application/cqrs';
import { CommandResult } from '@core/application/command-result';

export interface ActivateApprovalChainCommand extends ICommand {
  readonly chainId: string;
  readonly workspaceId: string;
}

export class ActivateApprovalChainHandler implements ICommandHandler<
  ActivateApprovalChainCommand,
  CommandResult<ApprovalChainDTO>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  async handle(
    command: ActivateApprovalChainCommand
  ): Promise<CommandResult<ApprovalChainDTO>> {
    const chain = await this.approvalChainService.activateChain(
      command.chainId,
      command.workspaceId
    );
    return CommandResult.success(chain);
  }
}
