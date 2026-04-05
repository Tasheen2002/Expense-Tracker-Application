import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { BankTransaction, BankTransactionDTO } from '../../domain/entities/bank-transaction.entity';
import { IBankTransactionRepository } from '../../domain/repositories/bank-transaction.repository';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';
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
    private readonly transactionRepository: IBankTransactionRepository
  ) {}

  async handle(
    query: GetPendingTransactionsQuery
  ): Promise<QueryResult<PaginatedResult<BankTransactionDTO>>> {
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

    const dtoResult: PaginatedResult<BankTransactionDTO> = {
      ...result,
      items: result.items.map((tx) => BankTransaction.toDTO(tx)),
    };

    return QueryResult.success(dtoResult);
  }
}
