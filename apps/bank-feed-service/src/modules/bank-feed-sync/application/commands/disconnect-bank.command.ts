import { TransactionSyncService } from '../services/transaction-sync.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface DisconnectBankCommand extends ICommand {
  readonly workspaceId: string;
  readonly connectionId: string;
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
