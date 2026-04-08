import { TransactionSyncService } from '../services/transaction-sync.service';
import { CommandResult } from '../../../../packages/core/src/application/command-result';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface UpdateConnectionTokenCommand extends ICommand {
  workspaceId: string;
  connectionId: string;
  accessToken: string;
  tokenExpiresAt?: Date;
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
