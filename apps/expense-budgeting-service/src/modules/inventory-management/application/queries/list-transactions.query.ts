
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

    return this.stockService.getTransactionsByFilters(
      { workspaceId: query.workspaceId, variantId: query.variantId, locationId: query.locationId },
      options
    );
  }
}
