import { ForecastService } from "../services/forecast.service";
import { ForecastItem } from "../../domain/entities/forecast-item.entity";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class GetForecastItemsQuery {
  constructor(
    public readonly forecastId: string,
    public readonly userId: string,
  ) {}
}

export class GetForecastItemsHandler {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(query: GetForecastItemsQuery): Promise<PaginatedResult<ForecastItem>> {
    return await this.forecastService.getForecastItems(
      query.forecastId,
      query.userId,
    );
  }
}
