import { TransactionSyncService } from '../services/transaction-sync.service';
import { CommandResult } from '../../../../packages/core/src/application/command-result';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface DisconnectBankCommand extends ICommand {
  workspaceId: string;
  connectionId: string;
}

export class DisconnectBankHandler implements ICommandHandler<
  DisconnectBankCommand,
  CommandResult<void>
> {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(command: DisconnectBankCommand): Promise<CommandResult<void>> {
    await this.transactionSyncService.disconnectBank(
      command.connectionId,
      command.workspaceId
    );
    return CommandResult.success();
  }
}
