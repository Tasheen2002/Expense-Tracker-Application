import { WorkspaceId } from '../../../identity-workspace';
import { BankTransactionId } from '../../domain/value-objects/bank-transaction-id';
import { BankTransaction } from '../../domain/entities/bank-transaction.entity';
import { IBankTransactionRepository } from '../../domain/repositories/bank-transaction.repository';
import { BankTransactionNotFoundError } from '../../domain/errors';
import { QueryResult } from '../../../../apps/api/src/shared/application/query-result';

export interface GetBankTransactionQuery {
  workspaceId: string;
  transactionId: string;
}

export class GetBankTransactionHandler {
  constructor(
    private readonly transactionRepository: IBankTransactionRepository
  ) {}

  async handle(
    query: GetBankTransactionQuery
  ): Promise<QueryResult<BankTransaction>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    const transactionId = BankTransactionId.fromString(query.transactionId);

    const transaction = await this.transactionRepository.findById(
      transactionId,
      workspaceId
    );

    if (!transaction) {
      throw new BankTransactionNotFoundError(query.transactionId);
    }

    return QueryResult.success(transaction);
  }
}
