import { ForecastService } from '../services/forecast.service';
import { ForecastDTO } from '../../domain/entities/forecast.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface ListForecastsQuery extends IQuery {
  readonly planId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class ListForecastsHandler implements IQueryHandler<
  ListForecastsQuery,
  PaginatedResult<ForecastDTO>
> {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(query: ListForecastsQuery): Promise<PaginatedResult<ForecastDTO>> {
    return this.forecastService.getForecastsByPlan(
      query.planId,
      query.workspaceId,
    );
  }
}
