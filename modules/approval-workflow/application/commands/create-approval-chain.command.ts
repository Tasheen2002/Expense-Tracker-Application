import { ApprovalChainService } from '../services/approval-chain.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface CreateApprovalChainInput extends ICommand {
  workspaceId: string;
  name: string;
  description?: string;
  minAmount?: number;
  maxAmount?: number;
  categoryIds?: string[];
  requiresReceipt: boolean;
  approverSequence: string[];
}

export class CreateApprovalChainHandler implements ICommandHandler<
  CreateApprovalChainInput,
  CommandResult<ApprovalChainDTO>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  async handle(
    input: CreateApprovalChainInput
  ): Promise<CommandResult<ApprovalChainDTO>> {
    const chain = await this.approvalChainService.createChain(input);
    return CommandResult.success(chain);
  }
}
