import { TransactionSyncService } from '../services/transaction-sync.service';
import { BankTransactionDTO } from '../../domain/entities/bank-transaction.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetBankTransactionQuery extends IQuery {
  workspaceId: string;
  transactionId: string;
}

export class GetBankTransactionHandler implements IQueryHandler<
  GetBankTransactionQuery,
  QueryResult<BankTransactionDTO>
> {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(
    query: GetBankTransactionQuery
  ): Promise<QueryResult<BankTransactionDTO>> {
    const dto = await this.transactionSyncService.getTransaction(
      query.transactionId,
      query.workspaceId
    );
    return QueryResult.success(dto);
  }
}
