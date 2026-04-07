import { ApprovalChainService } from '../services/approval-chain.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface UpdateApprovalChainInput extends ICommand {
  chainId: string;
  workspaceId: string;
  name?: string;
  description?: string;
  minAmount?: number;
  maxAmount?: number;
  categoryIds?: string[];
  requiresReceipt?: boolean;
  approverSequence?: string[];
}

export class UpdateApprovalChainHandler implements ICommandHandler<
  UpdateApprovalChainInput,
  CommandResult<ApprovalChainDTO>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  async handle(
    input: UpdateApprovalChainInput
  ): Promise<CommandResult<ApprovalChainDTO>> {
    try {
      const chain = await this.approvalChainService.updateChain(input);
      return CommandResult.success(chain);
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
