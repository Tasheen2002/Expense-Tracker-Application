import { ApprovalChainService } from '../services/approval-chain.service';
import { OperationService } from '../services/operation.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface ActivateApprovalChainCommand extends ICommand {
  readonly actorId: string;
  readonly chainId: string;
  readonly workspaceId: string;
  readonly authToken?: string;
}

export class ActivateApprovalChainHandler implements ICommandHandler<
  ActivateApprovalChainCommand,
  CommandResult<ApprovalChainDTO>
> {
  constructor(
    private readonly approvalChainService: ApprovalChainService,
    private readonly operations: OperationService
  ) {}

  async handle(
    command: ActivateApprovalChainCommand
  ): Promise<CommandResult<ApprovalChainDTO>> {
    const chain = await this.operations.execute(
      { actorId: command.actorId, workspaceId: command.workspaceId, role: 'ADMIN', authToken: command.authToken },
      async () =>
        this.approvalChainService.activateChain(
          command.chainId,
          command.workspaceId
        )
    );
    return CommandResult.success(chain);
  }
}
