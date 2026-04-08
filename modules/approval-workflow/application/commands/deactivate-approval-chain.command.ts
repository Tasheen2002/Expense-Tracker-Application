import { ApprovalChainService } from '../services/approval-chain.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface DeactivateApprovalChainInput extends ICommand {
  chainId: string;
  workspaceId: string;
}

export class DeactivateApprovalChainHandler implements ICommandHandler<
  DeactivateApprovalChainInput,
  CommandResult<ApprovalChainDTO>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  async handle(
    input: DeactivateApprovalChainInput
  ): Promise<CommandResult<ApprovalChainDTO>> {
    const chain = await this.approvalChainService.deactivateChain(
      input.chainId,
      input.workspaceId
    );
    return CommandResult.success(chain);
  }
}
