import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { BankConnectionId } from '../../domain/value-objects/bank-connection-id';
import { BankTransaction, BankTransactionDTO } from '../../domain/entities/bank-transaction.entity';
import { IBankTransactionRepository } from '../../domain/repositories/bank-transaction.repository';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetTransactionsByConnectionQuery extends IQuery {
  workspaceId: string;
  connectionId: string;
  options?: PaginationOptions;
}

export class GetTransactionsByConnectionHandler implements IQueryHandler<
  GetTransactionsByConnectionQuery,
  QueryResult<PaginatedResult<BankTransactionDTO>>
> {
  constructor(
    private readonly transactionRepository: IBankTransactionRepository
  ) {}

  async handle(
    query: GetTransactionsByConnectionQuery
  ): Promise<QueryResult<PaginatedResult<BankTransactionDTO>>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    const connectionId = BankConnectionId.fromString(query.connectionId);

    const result = await this.transactionRepository.findByConnection(
      workspaceId,
      connectionId,
      query.options
    );

    const dtoResult: PaginatedResult<BankTransactionDTO> = {
      ...result,
      items: result.items.map((tx) => BankTransaction.toDTO(tx)),
    };

    return QueryResult.success(dtoResult);
  }
}
