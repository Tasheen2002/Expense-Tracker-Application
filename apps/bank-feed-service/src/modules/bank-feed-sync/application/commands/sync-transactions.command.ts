import { TransactionSyncService } from '../services/transaction-sync.service';
import { SyncSessionDTO } from '../../domain/entities/sync-session.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface SyncTransactionsCommand extends ICommand {
  readonly workspaceId: string;
  readonly connectionId: string;
  readonly fromDate?: Date;
  readonly toDate?: Date;
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
