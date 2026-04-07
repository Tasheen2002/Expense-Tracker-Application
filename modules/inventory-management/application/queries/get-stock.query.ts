import { StockService } from '../services/stock.service';
import { StockDTO } from '../../domain/entities/stock.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface GetStockQuery extends IQuery {
  workspaceId: string;
  locationId?: string;
  limit?: number;
  offset?: number;
}

export class GetStockHandler
  implements IQueryHandler<GetStockQuery, QueryResult<PaginatedResult<StockDTO>>>
{
  constructor(private readonly stockService: StockService) {}

  async handle(
    query: GetStockQuery
  ): Promise<QueryResult<PaginatedResult<StockDTO>>> {
    const result = query.locationId
      ? await this.stockService.getStockByLocation(
          query.locationId,
          query.workspaceId,
          { limit: query.limit, offset: query.offset }
        )
      : await this.stockService.getStockByWorkspace(query.workspaceId, {
          limit: query.limit,
          offset: query.offset,
        });

    return QueryResult.success(result);
  }
}
