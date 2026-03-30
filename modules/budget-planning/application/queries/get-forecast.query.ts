import { ForecastService } from '../services/forecast.service';
import { Forecast } from '../../domain/entities/forecast.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetForecastQuery extends IQuery {
  id: string;
  userId: string;
}

export class GetForecastHandler implements IQueryHandler<
  GetForecastQuery,
  QueryResult<Forecast>
> {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(query: GetForecastQuery): Promise<QueryResult<Forecast>> {
    const result = await this.forecastService.getForecast(
      query.id,
      query.userId
    );
    return QueryResult.success(result);
  }
}
