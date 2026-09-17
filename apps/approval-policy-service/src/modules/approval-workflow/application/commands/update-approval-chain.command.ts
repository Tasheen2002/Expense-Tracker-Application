import { ApprovalChainService } from '../services/approval-chain.service';
import { OperationService } from '../services/operation.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface UpdateApprovalChainCommand extends ICommand {
  readonly actorId: string;
  readonly chainId: string;
  readonly workspaceId: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly minAmount?: number | null;
  readonly maxAmount?: number | null;
  readonly categoryIds?: string[];
  readonly requiresReceipt?: boolean;
  readonly approverSequence?: string[];
  readonly authToken?: string;
}

export class UpdateApprovalChainHandler implements ICommandHandler<
  UpdateApprovalChainCommand,
  CommandResult<ApprovalChainDTO>
> {
  constructor(
    private readonly approvalChainService: ApprovalChainService,
    private readonly operations: OperationService
  ) {}

  async handle(
    command: UpdateApprovalChainCommand
  ): Promise<CommandResult<ApprovalChainDTO>> {
    const chain = await this.operations.execute(
      {
        actorId: command.actorId,
        workspaceId: command.workspaceId,
        role: 'ADMIN',
        authToken: command.authToken,
      },
      async () => this.approvalChainService.updateChain(command)
    );
    return CommandResult.success(chain);
  }
}
