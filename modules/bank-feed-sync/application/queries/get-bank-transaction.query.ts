import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { BankTransactionId } from '../../domain/value-objects/bank-transaction-id';
import { IBankTransactionRepository } from '../../domain/repositories/bank-transaction.repository';
import { BankTransaction, BankTransactionDTO } from '../../domain/entities/bank-transaction.entity';
import { BankTransactionNotFoundError } from '../../domain/errors/bank-feed-sync.errors';
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
    private readonly transactionRepository: IBankTransactionRepository
  ) {}

  async handle(
    query: GetBankTransactionQuery
  ): Promise<QueryResult<BankTransactionDTO>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    const transactionId = BankTransactionId.fromString(query.transactionId);

    const transaction = await this.transactionRepository.findById(
      transactionId,
      workspaceId
    );

    if (!transaction) {
      throw new BankTransactionNotFoundError(query.transactionId);
    }

    return QueryResult.success(BankTransaction.toDTO(transaction));
  }
}
