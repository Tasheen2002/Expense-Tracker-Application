import { ForecastRepository } from '../../domain/repositories/forecast.repository';
import { Forecast, ForecastDTO } from '../../domain/entities/forecast.entity';
import { PlanId } from '../../domain/value-objects/plan-id';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface ListForecastsQuery extends IQuery {
  planId: string;
  userId: string;
}

export class ListForecastsHandler implements IQueryHandler<
  ListForecastsQuery,
  QueryResult<PaginatedResult<ForecastDTO>>
> {
  constructor(private readonly forecastRepository: ForecastRepository) {}

  async handle(
    query: ListForecastsQuery
  ): Promise<QueryResult<PaginatedResult<ForecastDTO>>> {
    const result = await this.forecastRepository.findByPlanId(
      PlanId.fromString(query.planId)
    );
    return QueryResult.success({
      items: result.items.map((f) => Forecast.toDTO(f)),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }
}
