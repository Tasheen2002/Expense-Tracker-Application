import { TransactionSyncService } from '../services/transaction-sync.service';
import { BankTransactionDTO } from '../../domain/entities/bank-transaction.entity';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetPendingTransactionsQuery extends IQuery {
  workspaceId: string;
  connectionId?: string;
  options?: PaginationOptions;
}

export class GetPendingTransactionsHandler implements IQueryHandler<
  GetPendingTransactionsQuery,
  QueryResult<PaginatedResult<BankTransactionDTO>>
> {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(
    query: GetPendingTransactionsQuery
  ): Promise<QueryResult<PaginatedResult<BankTransactionDTO>>> {
    const result = await this.transactionSyncService.getPendingTransactions(
      query.workspaceId,
      query.connectionId,
      query.options
    );
    return QueryResult.success(result);
  }
}
