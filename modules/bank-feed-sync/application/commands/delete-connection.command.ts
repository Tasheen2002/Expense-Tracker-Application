import { TransactionSyncService } from '../services/transaction-sync.service';
import { CommandResult } from '../../../../packages/core/src/application/command-result';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface DeleteConnectionCommand extends ICommand {
  workspaceId: string;
  connectionId: string;
}

export class DeleteConnectionHandler implements ICommandHandler<
  DeleteConnectionCommand,
  CommandResult<void>
> {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(command: DeleteConnectionCommand): Promise<CommandResult<void>> {
    await this.transactionSyncService.deleteConnection(
      command.connectionId,
      command.workspaceId
    );
    return CommandResult.success();
  }
}
