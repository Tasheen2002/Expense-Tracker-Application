import { IForecastItemRepository } from '../../domain/repositories/forecast-item.repository';
import { ForecastItem, ForecastItemDTO } from '../../domain/entities/forecast-item.entity';
import { ForecastId } from '../../domain/value-objects/forecast-id';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetForecastItemsQuery extends IQuery {
  forecastId: string;
  userId: string;
}

export class GetForecastItemsHandler implements IQueryHandler<
  GetForecastItemsQuery,
  QueryResult<PaginatedResult<ForecastItemDTO>>
> {
  constructor(private readonly forecastItemRepository: IForecastItemRepository) {}

  async handle(
    query: GetForecastItemsQuery
  ): Promise<QueryResult<PaginatedResult<ForecastItemDTO>>> {
    const result = await this.forecastItemRepository.findByForecastId(
      ForecastId.fromString(query.forecastId)
    );
    return QueryResult.success({
      items: result.items.map((item) => ForecastItem.toDTO(item)),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }
}
