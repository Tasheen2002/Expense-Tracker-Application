import { IStockRepository } from '../../domain/repositories/stock.repository';
import { Stock, StockDTO } from '../../domain/entities/stock.entity';
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
  constructor(private readonly stockRepository: IStockRepository) {}

  async handle(
    query: GetStockQuery
  ): Promise<QueryResult<PaginatedResult<StockDTO>>> {
    const result = query.locationId
      ? await this.stockRepository.findByLocation(
          query.locationId,
          query.workspaceId,
          { limit: query.limit, offset: query.offset }
        )
      : await this.stockRepository.findByWorkspace(query.workspaceId, {
          limit: query.limit,
          offset: query.offset,
        });

    const dtoResult: PaginatedResult<StockDTO> = {
      items: result.items.map((s) => Stock.toDTO(s)),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };

    return QueryResult.success(dtoResult);
  }
}
