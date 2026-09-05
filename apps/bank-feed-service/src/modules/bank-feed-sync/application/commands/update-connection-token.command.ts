import { TransactionSyncService } from '../services/transaction-sync.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface UpdateConnectionTokenCommand extends ICommand {
  readonly workspaceId: string;
  readonly connectionId: string;
  readonly accessToken: string;
  readonly tokenExpiresAt?: Date;
}

export class UpdateConnectionTokenHandler implements ICommandHandler<
  UpdateConnectionTokenCommand,
  CommandResult<void>
> {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(
    command: UpdateConnectionTokenCommand
  ): Promise<CommandResult<void>> {
    await this.transactionSyncService.updateConnectionToken(
      command.connectionId,
      command.workspaceId,
      command.accessToken,
      command.tokenExpiresAt
    );
    return CommandResult.success();
  }
}
