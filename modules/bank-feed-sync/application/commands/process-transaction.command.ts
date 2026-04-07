import { TransactionSyncService } from '../services/transaction-sync.service';
import { CommandResult } from '../../../../packages/core/src/application/command-result';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface ProcessTransactionCommand extends ICommand {
  workspaceId: string;
  transactionId: string;
  action: 'import' | 'match' | 'ignore';
  expenseId?: string;
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
