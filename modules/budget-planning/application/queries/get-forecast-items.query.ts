import { ForecastService } from "../services/forecast.service";
import { ForecastItem } from "../../domain/entities/forecast-item.entity";

export class GetForecastItemsQuery {
  constructor(public readonly forecastId: string) {}
}

export class GetForecastItemsHandler {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(query: GetForecastItemsQuery): Promise<ForecastItem[]> {
    return await this.forecastService.getForecastItems(query.forecastId);
  }
}
