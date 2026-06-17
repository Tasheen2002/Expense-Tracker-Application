import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { TransactionSyncService } from '../services/transaction-sync.service';
import { BankConnectionDTO } from '../../domain/entities/bank-connection.entity';

export interface ConnectBankCommand extends ICommand {
  readonly workspaceId: string;
  readonly userId: string;
  readonly institutionId: string;
  readonly institutionName: string;
  readonly accountId: string;
  readonly accountName: string;
  readonly accountType: string;
  readonly currency: string;
  readonly accessToken: string;
  readonly accountMask?: string;
  readonly tokenExpiresAt?: Date;
}

export class ConnectBankHandler implements ICommandHandler<
  ConnectBankCommand,
  CommandResult<BankConnectionDTO>
> {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(command: ConnectBankCommand): Promise<CommandResult<BankConnectionDTO>> {
    const dto = await this.transactionSyncService.connectBank(command);
    return CommandResult.success(dto);
  }
}
