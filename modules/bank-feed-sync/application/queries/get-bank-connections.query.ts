import { TransactionSyncService } from '../services/transaction-sync.service';
import { BankConnectionDTO } from '../../domain/entities/bank-connection.entity';
import {
  PaginatedResult,
} from '@core/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetBankConnectionsQuery extends IQuery {
  readonly workspaceId: string;
  readonly userId?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class GetBankConnectionsHandler implements IQueryHandler<
  GetBankConnectionsQuery,
  PaginatedResult<BankConnectionDTO>
> {
  constructor(
    private readonly transactionSyncService: TransactionSyncService
  ) {}

  async handle(query: GetBankConnectionsQuery): Promise<PaginatedResult<BankConnectionDTO>> {
    return this.transactionSyncService.getConnections(
      query.workspaceId,
      query.userId,
      { limit: query.limit, offset: query.offset }
    );
  }
}
