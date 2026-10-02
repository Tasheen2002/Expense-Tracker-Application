import { ForecastService } from '../services/forecast.service';
import { ForecastItemDTO } from '../../domain/entities/forecast-item.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetForecastItemsQuery extends IQuery {
  readonly forecastId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class GetForecastItemsHandler implements IQueryHandler<
  GetForecastItemsQuery,
  PaginatedResult<ForecastItemDTO>
> {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(query: GetForecastItemsQuery): Promise<PaginatedResult<ForecastItemDTO>> {
    return this.forecastService.getForecastItemsByForecast(
      query.forecastId,
      query.workspaceId,
      query.limit !== undefined || query.offset !== undefined
        ? {
            limit: query.limit,
            offset: query.offset,
          }
        : undefined
    );
  }
}
