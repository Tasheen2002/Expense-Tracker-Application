import { ApprovalChainService } from '../services/approval-chain.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import {
  ICommand,
  ICommandHandler,
} from '@core/application/cqrs';
import { CommandResult } from '@core/application/command-result';

export interface UpdateApprovalChainCommand extends ICommand {
  readonly chainId: string;
  readonly workspaceId: string;
  readonly name?: string;
  readonly description?: string;
  readonly minAmount?: number;
  readonly maxAmount?: number;
  readonly categoryIds?: string[];
  readonly requiresReceipt?: boolean;
  readonly approverSequence?: string[];
}

export class UpdateApprovalChainHandler implements ICommandHandler<
  UpdateApprovalChainCommand,
  CommandResult<ApprovalChainDTO>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  async handle(
    command: UpdateApprovalChainCommand
  ): Promise<CommandResult<ApprovalChainDTO>> {
    const chain = await this.approvalChainService.updateChain(command);
    return CommandResult.success(chain);
  }
}
