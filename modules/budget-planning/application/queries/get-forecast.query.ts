import { IForecastRepository } from '../../domain/repositories/forecast.repository';
import { Forecast, ForecastDTO } from '../../domain/entities/forecast.entity';
import { ForecastId } from '../../domain/value-objects/forecast-id';
import { ForecastNotFoundError } from '../../domain/errors/budget-planning.errors';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetForecastQuery extends IQuery {
  id: string;
  workspaceId: string;
  userId: string;
}

export class GetForecastHandler implements IQueryHandler<
  GetForecastQuery,
  QueryResult<ForecastDTO>
> {
  constructor(private readonly forecastRepository: IForecastRepository) {}

  async handle(query: GetForecastQuery): Promise<QueryResult<ForecastDTO>> {
    const forecast = await this.forecastRepository.findById(
      ForecastId.fromString(query.id),
      query.workspaceId
    );
    if (!forecast) {
      throw new ForecastNotFoundError(query.id);
    }
    return QueryResult.success(Forecast.toDTO(forecast));
  }
}
