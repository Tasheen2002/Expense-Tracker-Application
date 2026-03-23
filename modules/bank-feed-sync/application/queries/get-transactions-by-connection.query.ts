import { WorkspaceId } from '../../../identity-workspace';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { BankTransaction } from '../../domain/entities/bank-transaction.entity';
import { IBankTransactionRepository } from '../../domain/repositories/bank-transaction.repository';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import { IQuery, IQueryHandler, QueryResult } from '../../../../apps/api/src/shared/application';
export interface GetTransactionsByConnectionQuery extends IQuery {
  workspaceId: string;
  connectionId: string;
  options?: PaginationOptions;
}

export class GetTransactionsByConnectionHandler implements IQueryHandler<GetTransactionsByConnectionQuery, QueryResult<PaginatedResult<BankTransaction>>> {
  constructor(
    private readonly transactionRepository: IBankTransactionRepository
  ) {}

  async handle(
    query: GetTransactionsByConnectionQuery
  ): Promise<QueryResult<PaginatedResult<BankTransaction>>> {
    try {
      
          const workspaceId = WorkspaceId.fromString(query.workspaceId);
          const connectionId = BankConnectionId.fromString(query.connectionId);
      
          const result = await this.transactionRepository.findByConnection(
            workspaceId,
            connectionId,
            query.options
          );
      
          return QueryResult.success(result);
        
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
