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

export interface GetPendingTransactionsQuery extends IQuery {
  workspaceId: string;
  connectionId?: string;
  options?: PaginationOptions;
}

export class GetPendingTransactionsHandler implements IQueryHandler<
  GetPendingTransactionsQuery,
  PaginatedResult<BankTransactionDTO>
> {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(query: GetPendingTransactionsQuery): Promise<PaginatedResult<BankTransactionDTO>> {
    return this.transactionSyncService.getPendingTransactions(
      query.workspaceId,
      query.connectionId,
      query.options
    );
  }
}
