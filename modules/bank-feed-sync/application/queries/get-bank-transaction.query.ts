import { TransactionSyncService } from '../services/transaction-sync.service';
import { BankTransactionDTO } from '../../domain/entities/bank-transaction.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetBankTransactionQuery extends IQuery {
  workspaceId: string;
  transactionId: string;
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
