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

export interface GetTransactionsByConnectionQuery extends IQuery {
  workspaceId: string;
  connectionId: string;
  options?: PaginationOptions;
}

export class GetTransactionsByConnectionHandler implements IQueryHandler<
  GetTransactionsByConnectionQuery,
  PaginatedResult<BankTransactionDTO>
> {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(query: GetTransactionsByConnectionQuery): Promise<PaginatedResult<BankTransactionDTO>> {
    return this.transactionSyncService.getTransactionsByConnection(
      query.workspaceId,
      query.connectionId,
      query.options
    );
  }
}
