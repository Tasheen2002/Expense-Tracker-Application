import { ApprovalChainService } from '../services/approval-chain.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface UpdateApprovalChainInput extends ICommand {
  chainId: string;
  workspaceId: string;
  name?: string;
  description?: string;
  minAmount?: number;
  maxAmount?: number;
  approverSequence?: string[];
}

export class UpdateApprovalChainHandler implements ICommandHandler<
  UpdateApprovalChainInput,
  CommandResult<void>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  private getStatusCode(error: unknown): number {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      return (error as { statusCode: number }).statusCode;
    }
    return 500;
  }

  async handle(input: UpdateApprovalChainInput): Promise<CommandResult<void>> {
    try {
      await this.approvalChainService.updateChain(input);
      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.failure(
        error instanceof Error ? error.message : 'Command failed',
        undefined,
        this.getStatusCode(error)
      );
    }
  }
}
