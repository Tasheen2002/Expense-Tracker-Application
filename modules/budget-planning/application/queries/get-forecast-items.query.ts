import { IForecastItemRepository } from '../../domain/repositories/forecast-item.repository';
import { IForecastRepository } from '../../domain/repositories/forecast.repository';
import { ForecastItem, ForecastItemDTO } from '../../domain/entities/forecast-item.entity';
import { ForecastId } from '../../domain/value-objects/forecast-id';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { ForecastNotFoundError } from '../../domain/errors/budget-planning.errors';

export interface GetForecastItemsQuery extends IQuery {
  forecastId: string;
  workspaceId: string;
  userId: string;
}

export class GetForecastItemsHandler implements IQueryHandler<
  GetForecastItemsQuery,
  QueryResult<PaginatedResult<ForecastItemDTO>>
> {
  constructor(
    private readonly forecastItemRepository: IForecastItemRepository,
    private readonly forecastRepository: IForecastRepository,
  ) {}

  async handle(
    query: GetForecastItemsQuery
  ): Promise<QueryResult<PaginatedResult<ForecastItemDTO>>> {
    try {
      const forecast = await this.forecastRepository.findById(
        ForecastId.fromString(query.forecastId),
        query.workspaceId
      );
      if (!forecast) {
        throw new ForecastNotFoundError(query.forecastId);
      }

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
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
