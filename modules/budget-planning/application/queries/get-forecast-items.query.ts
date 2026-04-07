import { ForecastService } from '../services/forecast.service';
import { ForecastItemDTO } from '../../domain/entities/forecast-item.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetForecastItemsQuery extends IQuery {
  forecastId: string;
  workspaceId: string;
  userId: string;
}

export class GetForecastItemsHandler implements IQueryHandler<
  GetForecastItemsQuery,
  QueryResult<PaginatedResult<ForecastItemDTO>>
> {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(
    query: GetForecastItemsQuery
  ): Promise<QueryResult<PaginatedResult<ForecastItemDTO>>> {
    const result = await this.forecastService.getForecastItemsByForecast(
      query.forecastId,
      query.workspaceId,
    );
    return QueryResult.success(result);
  }
}
