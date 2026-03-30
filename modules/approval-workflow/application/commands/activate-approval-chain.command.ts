import { ApprovalChainService } from '../services/approval-chain.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface ActivateApprovalChainInput extends ICommand {
  chainId: string;
  workspaceId: string;
}

export class ActivateApprovalChainHandler implements ICommandHandler<
  ActivateApprovalChainInput,
  CommandResult<ApprovalChainDTO>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  async handle(
    input: ActivateApprovalChainInput
  ): Promise<CommandResult<ApprovalChainDTO>> {
    try {
      const chain = await this.approvalChainService.activateChain(
        input.chainId,
        input.workspaceId
      );
      return CommandResult.success(chain.toJSON());
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
