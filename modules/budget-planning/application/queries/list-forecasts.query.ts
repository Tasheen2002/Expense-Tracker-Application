import { ForecastService } from '../services/forecast.service';
import { ForecastDTO } from '../../domain/entities/forecast.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface ListForecastsQuery extends IQuery {
  planId: string;
  workspaceId: string;
  userId: string;
}

export class ListForecastsHandler implements IQueryHandler<
  ListForecastsQuery,
  QueryResult<PaginatedResult<ForecastDTO>>
> {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(
    query: ListForecastsQuery
  ): Promise<QueryResult<PaginatedResult<ForecastDTO>>> {
    const result = await this.forecastService.getForecastsByPlan(
      query.planId,
      query.workspaceId,
    );
    return QueryResult.success(result);
  }
}
