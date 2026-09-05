
import { StockService } from '../services/stock.service';
import { StockDTO } from '../../domain/entities/stock.entity';
import {
  IQuery, IQueryHandler } from '@core/application/cqrs';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';

export interface GetStockQuery extends IQuery {
  readonly workspaceId: string;
  readonly locationId?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class GetStockHandler
  implements IQueryHandler<GetStockQuery, PaginatedResult<StockDTO>>
{
  constructor(private readonly stockService: StockService) {}

  async handle(query: GetStockQuery): Promise<PaginatedResult<StockDTO>> {
    return query.locationId
      ? this.stockService.getStockByLocation(
          query.locationId,
          query.workspaceId,
          { limit: query.limit, offset: query.offset }
        )
      : this.stockService.getStockByWorkspace(query.workspaceId, {
          limit: query.limit,
          offset: query.offset,
        });
  }
}
