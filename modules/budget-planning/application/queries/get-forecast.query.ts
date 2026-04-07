import { ForecastService } from '../services/forecast.service';
import { ForecastDTO } from '../../domain/entities/forecast.entity';
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
  constructor(private readonly forecastService: ForecastService) {}

  async handle(query: GetForecastQuery): Promise<QueryResult<ForecastDTO>> {
    const dto = await this.forecastService.getForecastById(query.id, query.workspaceId);
    if (!dto) {
      throw new ForecastNotFoundError(query.id);
    }
    return QueryResult.success(dto);
  }
}
