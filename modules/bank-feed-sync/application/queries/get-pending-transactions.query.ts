import { WorkspaceId } from '../../../identity-workspace';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { BankTransaction } from '../../domain/entities/bank-transaction.entity';
import { IBankTransactionRepository } from '../../domain/repositories/bank-transaction.repository';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import { IQuery, IQueryHandler, QueryResult } from '../../../../apps/api/src/shared/application';
export interface GetPendingTransactionsQuery extends IQuery {
  workspaceId: string;
  connectionId?: string;
  options?: PaginationOptions;
}

export class GetPendingTransactionsHandler implements IQueryHandler<GetPendingTransactionsQuery, QueryResult<PaginatedResult<BankTransaction>>> {
  constructor(
    private readonly transactionRepository: IBankTransactionRepository
  ) {}

  async handle(
    query: GetPendingTransactionsQuery
  ): Promise<QueryResult<PaginatedResult<BankTransaction>>> {
    try {
      
          const workspaceId = WorkspaceId.fromString(query.workspaceId);
      
          let result: PaginatedResult<BankTransaction>;
          if (query.connectionId) {
            const connectionId = BankConnectionId.fromString(query.connectionId);
            result = await this.transactionRepository.findByConnectionAndStatus(
              workspaceId,
              connectionId,
              TransactionStatus.PENDING,
              query.options
            );
          } else {
            result = await this.transactionRepository.findByStatus(
              workspaceId,
              TransactionStatus.PENDING,
              query.options
            );
          }
      
          return QueryResult.success(result);
        
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
