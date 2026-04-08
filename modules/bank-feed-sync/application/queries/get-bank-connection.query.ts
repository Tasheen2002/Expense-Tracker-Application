import { TransactionSyncService } from '../services/transaction-sync.service';
import { BankConnectionDTO } from '../../domain/entities/bank-connection.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetBankConnectionQuery extends IQuery {
  workspaceId: string;
  connectionId: string;
}

export class GetBankConnectionHandler implements IQueryHandler<
  GetBankConnectionQuery,
  QueryResult<BankConnectionDTO>
> {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(
    query: GetBankConnectionQuery
  ): Promise<QueryResult<BankConnectionDTO>> {
    const dto = await this.transactionSyncService.getConnection(
      query.connectionId,
      query.workspaceId
    );
    return QueryResult.success(dto);
  }
}
