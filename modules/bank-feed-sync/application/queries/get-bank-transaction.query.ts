import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { BankTransactionId } from '../../domain/value-objects/bank-transaction-id';
import { IBankTransactionRepository } from '../../domain/repositories/bank-transaction.repository';
import { BankTransactionNotFoundError } from '../../domain/errors/bank-feed-sync.errors';
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

export interface GetBankTransactionQuery extends IQuery {
  workspaceId: string;
  transactionId: string;
}

export class GetBankTransactionHandler implements IQueryHandler<
  GetBankTransactionQuery,
  QueryResult<BankTransactionResult>
> {
  constructor(
    private readonly transactionRepository: IBankTransactionRepository
  ) {}

  async handle(
    query: GetBankTransactionQuery
  ): Promise<QueryResult<BankTransactionResult>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    const transactionId = BankTransactionId.fromString(query.transactionId);

    const transaction = await this.transactionRepository.findById(
      transactionId,
      workspaceId
    );

    if (!transaction) {
      throw new BankTransactionNotFoundError(query.transactionId);
    }

    const result: BankTransactionResult = {
      id: transaction.id.getValue(),
      workspaceId: transaction.workspaceId.getValue(),
      connectionId: transaction.connectionId.getValue(),
      sessionId: transaction.sessionId.getValue(),
      externalId: transaction.externalId,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
      merchantName: transaction.merchantName,
      categoryName: transaction.categoryName,
      transactionDate: transaction.transactionDate,
      postedDate: transaction.postedDate,
      status: transaction.status,
      expenseId: transaction.expenseId,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };

    return QueryResult.success(result);
  }
}
