import { StockService } from '../services/stock.service';
import { InventoryTransactionDTO } from '../../domain/entities/inventory-transaction.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ListTransactionsQuery extends IQuery {
  workspaceId: string;
  variantId?: string;
  locationId?: string;
  limit?: number;
  offset?: number;
}

export class ListTransactionsHandler
  implements IQueryHandler<ListTransactionsQuery, PaginatedResult<InventoryTransactionDTO>>
{
  constructor(private readonly stockService: StockService) {}

  async handle(query: ListTransactionsQuery): Promise<PaginatedResult<InventoryTransactionDTO>> {
    const options = { limit: query.limit, offset: query.offset };

    if (query.variantId) {
      return this.stockService.getTransactionsByVariant(
        query.variantId,
        query.workspaceId,
        options
      );
    } else if (query.locationId) {
      return this.stockService.getTransactionsByLocation(
        query.locationId,
        query.workspaceId,
        options
      );
    } else {
      return this.stockService.getTransactionsByWorkspace(
        query.workspaceId,
        options
      );
    }
  }
}
