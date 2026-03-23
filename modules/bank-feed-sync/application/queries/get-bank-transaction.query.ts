import { WorkspaceId } from '../../../identity-workspace';
import { BankTransactionId } from '../../domain/value-objects/bank-transaction-id';
import { BankTransaction } from '../../domain/entities/bank-transaction.entity';
import { IBankTransactionRepository } from '../../domain/repositories/bank-transaction.repository';
import { BankTransactionNotFoundError } from '../../domain/errors';
import { IQuery, IQueryHandler, QueryResult } from '../../../../apps/api/src/shared/application';
export interface GetBankTransactionQuery extends IQuery {
  workspaceId: string;
  transactionId: string;
}

export class GetBankTransactionHandler implements IQueryHandler<GetBankTransactionQuery, QueryResult<BankTransaction>> {
  constructor(
    private readonly transactionRepository: IBankTransactionRepository
  ) {}

  async handle(
    query: GetBankTransactionQuery
  ): Promise<QueryResult<BankTransaction>> {
    try {
      
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
        
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
