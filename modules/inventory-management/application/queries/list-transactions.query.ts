import { IInventoryTransactionRepository } from '../../domain/repositories/inventory-transaction.repository';
import { InventoryTransaction, InventoryTransactionDTO } from '../../domain/entities/inventory-transaction.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ListTransactionsQuery extends IQuery {
  workspaceId: string;
  variantId?: string;
  locationId?: string;
  limit?: number;
  offset?: number;
}

export class ListTransactionsHandler
  implements IQueryHandler<ListTransactionsQuery, QueryResult<PaginatedResult<InventoryTransactionDTO>>>
{
  constructor(
    private readonly transactionRepository: IInventoryTransactionRepository
  ) {}

  async handle(
    query: ListTransactionsQuery
  ): Promise<QueryResult<PaginatedResult<InventoryTransactionDTO>>> {
    let result;

    if (query.variantId) {
      result = await this.transactionRepository.findByVariant(
        query.variantId,
        query.workspaceId,
        { limit: query.limit, offset: query.offset }
      );
    } else if (query.locationId) {
      result = await this.transactionRepository.findByLocation(
        query.locationId,
        query.workspaceId,
        { limit: query.limit, offset: query.offset }
      );
    } else {
      result = await this.transactionRepository.findByWorkspace(
        query.workspaceId,
        { limit: query.limit, offset: query.offset }
      );
    }

    const dtoResult: PaginatedResult<InventoryTransactionDTO> = {
      items: result.items.map((t) => InventoryTransaction.toDTO(t)),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };

    return QueryResult.success(dtoResult);
  }
}
