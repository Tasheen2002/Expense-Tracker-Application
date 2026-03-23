import { TransactionSyncService, SyncTransactionsInput } from '../services/transaction-sync.service';
import { ICommand, ICommandHandler, CommandResult } from '../../../../apps/api/src/shared/application';
export interface SyncTransactionsCommand extends ICommand {
  workspaceId: string;
  connectionId: string;
  fromDate?: Date;
  toDate?: Date;
}

export class SyncTransactionsHandler implements ICommandHandler<SyncTransactionsCommand, CommandResult<{ sessionId: string }>> {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(
    command: SyncTransactionsCommand
  ): Promise<CommandResult<{ sessionId: string }>> {
    try {
      const input: SyncTransactionsInput = {
        workspaceId: command.workspaceId,
        connectionId: command.connectionId,
        fromDate: command.fromDate,
        toDate: command.toDate,
      };
      const session = await this.transactionSyncService.syncTransactions(input);
      return CommandResult.success({ sessionId: session.getId().getValue() });
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
