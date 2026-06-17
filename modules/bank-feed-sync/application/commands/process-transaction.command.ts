import { TransactionSyncService } from '../services/transaction-sync.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface ProcessTransactionCommand extends ICommand {
  readonly workspaceId: string;
  readonly transactionId: string;
  readonly action: 'import' | 'match' | 'ignore';
  readonly expenseId?: string;
}

export class ProcessTransactionHandler implements ICommandHandler<
  ProcessTransactionCommand,
  CommandResult<void>
> {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(
    command: ProcessTransactionCommand
  ): Promise<CommandResult<void>> {
    await this.transactionSyncService.processTransaction({
      workspaceId: command.workspaceId,
      transactionId: command.transactionId,
      action: command.action,
      expenseId: command.expenseId,
    });
    return CommandResult.success();
  }
}
