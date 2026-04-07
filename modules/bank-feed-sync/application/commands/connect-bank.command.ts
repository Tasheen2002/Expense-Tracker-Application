import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';
import { TransactionSyncService } from '../services/transaction-sync.service';

export interface ConnectBankCommand extends ICommand {
  workspaceId: string;
  userId: string;
  institutionId: string;
  institutionName: string;
  accountId: string;
  accountName: string;
  accountType: string;
  currency: string;
  accessToken: string;
  accountMask?: string;
  tokenExpiresAt?: Date;
}

export class ConnectBankHandler implements ICommandHandler<
  ConnectBankCommand,
  CommandResult<string>
> {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(command: ConnectBankCommand): Promise<CommandResult<string>> {
    const connectionId = await this.transactionSyncService.connectBank(command);
    return CommandResult.success(connectionId);
  }
}
