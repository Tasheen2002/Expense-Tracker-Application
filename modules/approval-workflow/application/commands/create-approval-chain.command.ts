import { ApprovalChainService } from '../services/approval-chain.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface CreateApprovalChainCommand extends ICommand {
  readonly workspaceId: string;
  readonly name: string;
  readonly description?: string;
  readonly minAmount?: number;
  readonly maxAmount?: number;
  readonly categoryIds?: string[];
  readonly requiresReceipt: boolean;
  readonly approverSequence: string[];
}

export class CreateApprovalChainHandler implements ICommandHandler<
  CreateApprovalChainCommand,
  CommandResult<ApprovalChainDTO>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  async handle(
    command: CreateApprovalChainCommand
  ): Promise<CommandResult<ApprovalChainDTO>> {
    const chain = await this.approvalChainService.createChain(command);
    return CommandResult.success(chain);
  }
}
