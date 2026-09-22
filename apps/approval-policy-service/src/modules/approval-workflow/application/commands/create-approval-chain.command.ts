import { ApprovalChainService } from '../services/approval-chain.service';
import { OperationService } from '../services/operation.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface CreateApprovalChainCommand extends ICommand {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly description?: string;
  readonly minAmount?: number;
  readonly maxAmount?: number;
  readonly categoryIds?: string[];
  readonly requiresReceipt: boolean;
  readonly approverSequence: string[];
  readonly authToken?: string;
}

export class CreateApprovalChainHandler implements ICommandHandler<
  CreateApprovalChainCommand,
  CommandResult<ApprovalChainDTO>
> {
  constructor(
    private readonly approvalChainService: ApprovalChainService,
    private readonly operations: OperationService
  ) {}

  async handle(
    command: CreateApprovalChainCommand
  ): Promise<CommandResult<ApprovalChainDTO>> {
    const chain = await this.operations.execute(
      {
        actorId: command.actorId,
        workspaceId: command.workspaceId,
        role: 'ADMIN',
        authToken: command.authToken,
      },
      async () => this.approvalChainService.createChain(command)
    );
    return CommandResult.success(chain);
  }
}
