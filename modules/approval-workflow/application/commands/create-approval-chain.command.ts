import { ApprovalChainService } from '../services/approval-chain.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

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
    try {
      const chain = await this.approvalChainService.createChain(input);
      return CommandResult.success(chain.toJSON());
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
