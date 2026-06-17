import { TransactionSyncService } from '../services/transaction-sync.service';
import { BankConnectionDTO } from '../../domain/entities/bank-connection.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetBankConnectionQuery extends IQuery {
  readonly workspaceId: string;
  readonly connectionId: string;
}

export class GetBankConnectionHandler implements IQueryHandler<
  GetBankConnectionQuery,
  BankConnectionDTO
> {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(query: GetBankConnectionQuery): Promise<BankConnectionDTO> {
    return this.transactionSyncService.getConnection(
      query.connectionId,
      query.workspaceId
    );
  }
}
