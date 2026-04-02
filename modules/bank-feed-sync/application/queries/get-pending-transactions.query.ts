import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { BankTransaction } from '../../domain/entities/bank-transaction.entity';
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

export interface BankTransactionResult {
  id: string;
  workspaceId: string;
  connectionId: string;
  sessionId: string;
  externalId: string;
  amount: number;
  currency: string;
  description: string;
  merchantName?: string;
  categoryName?: string;
  transactionDate: Date;
  postedDate?: Date;
  status: string;
  expenseId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetPendingTransactionsQuery extends IQuery {
  workspaceId: string;
  connectionId?: string;
  options?: PaginationOptions;
}

export class GetPendingTransactionsHandler implements IQueryHandler<
  GetPendingTransactionsQuery,
  QueryResult<PaginatedResult<BankTransactionResult>>
> {
  constructor(
    private readonly transactionRepository: IBankTransactionRepository
  ) {}

  async handle(
    query: GetPendingTransactionsQuery
  ): Promise<QueryResult<PaginatedResult<BankTransactionResult>>> {
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

    const dtoResult: PaginatedResult<BankTransactionResult> = {
      ...result,
      items: result.items.map((tx) => ({
        id: tx.id.getValue(),
        workspaceId: tx.workspaceId.getValue(),
        connectionId: tx.connectionId.getValue(),
        sessionId: tx.sessionId.getValue(),
        externalId: tx.externalId,
        amount: tx.amount,
        currency: tx.currency,
        description: tx.description,
        merchantName: tx.merchantName,
        categoryName: tx.categoryName,
        transactionDate: tx.transactionDate,
        postedDate: tx.postedDate,
        status: tx.status,
        expenseId: tx.expenseId,
        metadata: tx.metadata,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      })),
    };

    return QueryResult.success(dtoResult);
  }
}
