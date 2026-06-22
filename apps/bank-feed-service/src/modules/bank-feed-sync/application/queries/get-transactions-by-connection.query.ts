import { TransactionSyncService } from '../services/transaction-sync.service';
import { BankTransactionDTO } from '../../domain/entities/bank-transaction.entity';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetTransactionsByConnectionQuery extends IQuery {
  readonly workspaceId: string;
  readonly connectionId: string;
  readonly options?: PaginationOptions;
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
