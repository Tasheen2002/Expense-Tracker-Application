import { ApprovalChainService } from '../services/approval-chain.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

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
    try {
      const chain = await this.approvalChainService.deactivateChain(
        input.chainId,
        input.workspaceId
      );
      return CommandResult.success(chain.toJSON());
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
