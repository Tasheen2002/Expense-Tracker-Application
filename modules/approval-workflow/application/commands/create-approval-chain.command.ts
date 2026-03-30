import { ApprovalChainService } from '../services/approval-chain.service';
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
  CommandResult<{ chainId: string }>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  async handle(
    input: CreateApprovalChainInput
  ): Promise<CommandResult<{ chainId: string }>> {
    try {
      const chain = await this.approvalChainService.createChain(input);
      return CommandResult.success({ chainId: chain.getId().getValue() });
    } catch (error: unknown) {
      return CommandResult.failure(
        error instanceof Error ? error.message : 'Command failed',
        undefined,
        error && typeof error === 'object' && 'statusCode' in error
          ? (error as { statusCode: number }).statusCode
          : 500
      );
    }
  }
}
