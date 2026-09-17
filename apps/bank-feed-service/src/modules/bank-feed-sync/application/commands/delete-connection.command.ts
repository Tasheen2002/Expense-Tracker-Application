import { TransactionSyncService } from '../services/transaction-sync.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface DeleteConnectionCommand extends ICommand {
  readonly workspaceId: string;
  readonly connectionId: string;
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
