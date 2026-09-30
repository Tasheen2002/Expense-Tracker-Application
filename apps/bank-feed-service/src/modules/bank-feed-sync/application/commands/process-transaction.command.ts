import { TransactionSyncService } from '../services/transaction-sync.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface ProcessTransactionCommand extends ICommand {
  readonly workspaceId: string;
  readonly transactionId: string;
  readonly actorId: string;
  readonly action: 'import' | 'match' | 'ignore';
  readonly expenseId?: string;
  readonly authToken?: string;
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
      actorId: command.actorId,
      action: command.action,
      expenseId: command.expenseId,
      authToken: command.authToken,
    });
    return CommandResult.success();
  }
}
