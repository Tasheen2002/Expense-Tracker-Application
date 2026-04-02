import { ForecastService } from '../services/forecast.service';
import { ForecastItem } from '../../domain/entities/forecast-item.entity';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
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
  QueryResult<PaginatedResult<ForecastItem>>
> {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(
    query: GetForecastItemsQuery
  ): Promise<QueryResult<PaginatedResult<ForecastItem>>> {
    const result = await this.forecastService.getForecastItems(
      query.forecastId,
      query.userId
    );
    return QueryResult.success(result);
  }
}
