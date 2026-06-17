import { TransactionSyncService } from '../services/transaction-sync.service';
import { BankTransactionDTO } from '../../domain/entities/bank-transaction.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetBankTransactionQuery extends IQuery {
  readonly workspaceId: string;
  readonly transactionId: string;
}

export class GetBankTransactionHandler implements IQueryHandler<
  GetBankTransactionQuery,
  BankTransactionDTO
> {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(query: GetBankTransactionQuery): Promise<BankTransactionDTO> {
    return this.transactionSyncService.getTransaction(
      query.transactionId,
      query.workspaceId
    );
  }
}
