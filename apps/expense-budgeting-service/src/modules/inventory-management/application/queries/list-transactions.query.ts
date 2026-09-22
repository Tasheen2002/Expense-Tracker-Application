
import { StockService } from '../services/stock.service';
import { InventoryTransactionDTO } from '../../domain/entities/inventory-transaction.entity';
import {
  IQuery, IQueryHandler } from '@core/application/cqrs';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';

export interface ListTransactionsQuery extends IQuery {
  readonly workspaceId: string;
  readonly variantId?: string;
  readonly locationId?: string;
  readonly limit?: number;
  readonly offset?: number;
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
