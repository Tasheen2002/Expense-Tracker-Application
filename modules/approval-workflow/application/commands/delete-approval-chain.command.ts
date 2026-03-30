import { ApprovalChainService } from '../services/approval-chain.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface DeleteApprovalChainInput extends ICommand {
  chainId: string;
  workspaceId: string;
}

export class DeleteApprovalChainHandler implements ICommandHandler<
  DeleteApprovalChainInput,
  CommandResult<void>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  private getStatusCode(error: unknown): number {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      return (error as { statusCode: number }).statusCode;
    }
    return 500;
  }

  async handle(input: DeleteApprovalChainInput): Promise<CommandResult<void>> {
    try {
      await this.approvalChainService.deleteChain(
        input.chainId,
        input.workspaceId
      );
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
