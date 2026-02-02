import { ForecastService } from "../services/forecast.service";
import { Forecast } from "../../domain/entities/forecast.entity";

export class ListForecastsQuery {
  constructor(
    public readonly planId: string,
    public readonly userId: string,
  ) {}
}

export class ListForecastsHandler {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(query: ListForecastsQuery): Promise<Forecast[]> {
    return await this.forecastService.listForecasts(query.planId, query.userId);
  }
}
