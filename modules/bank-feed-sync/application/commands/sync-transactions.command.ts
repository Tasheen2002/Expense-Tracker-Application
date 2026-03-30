import { TransactionSyncService } from '../services/transaction-sync.service';
import { CommandResult } from '../../../../apps/api/src/shared/application/command-result';

export interface SyncTransactionsCommand {
  workspaceId: string;
  connectionId: string;
  fromDate?: Date;
  toDate?: Date;
}

export class SyncTransactionsHandler {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(
    command: SyncTransactionsCommand
  ): Promise<CommandResult<{ sessionId: string }>> {
    const session = await this.transactionSyncService.syncTransactions(command);
    return CommandResult.success({ sessionId: session.getId().getValue() });
  }
}
