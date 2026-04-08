import { StockService } from '../services/stock.service';
import { InventoryTransactionDTO } from '../../domain/entities/inventory-transaction.entity';
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
  constructor(private readonly stockService: StockService) {}

  async handle(
    query: ListTransactionsQuery
  ): Promise<QueryResult<PaginatedResult<InventoryTransactionDTO>>> {
    const options = { limit: query.limit, offset: query.offset };

    let result: PaginatedResult<InventoryTransactionDTO>;
    if (query.variantId) {
      result = await this.stockService.getTransactionsByVariant(
        query.variantId,
        query.workspaceId,
        options
      );
    } else if (query.locationId) {
      result = await this.stockService.getTransactionsByLocation(
        query.locationId,
        query.workspaceId,
        options
      );
    } else {
      result = await this.stockService.getTransactionsByWorkspace(
        query.workspaceId,
        options
      );
    }

    return QueryResult.success(result);
  }
}
