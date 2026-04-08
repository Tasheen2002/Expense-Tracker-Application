import { TransactionSyncService } from '../services/transaction-sync.service';
import { SyncSessionDTO } from '../../domain/entities/sync-session.entity';
import { CommandResult } from '../../../../packages/core/src/application/command-result';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface SyncTransactionsCommand extends ICommand {
  workspaceId: string;
  connectionId: string;
  fromDate?: Date;
  toDate?: Date;
}

export class SyncTransactionsHandler implements ICommandHandler<
  SyncTransactionsCommand,
  CommandResult<SyncSessionDTO>
> {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(
    command: SyncTransactionsCommand
  ): Promise<CommandResult<SyncSessionDTO>> {
    const dto = await this.transactionSyncService.syncTransactions(command);
    return CommandResult.success(dto);
  }
}
