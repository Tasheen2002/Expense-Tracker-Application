import { ForecastService } from "../services/forecast.service";
import { Forecast } from "../../domain/entities/forecast.entity";

export class GetForecastQuery {
  constructor(public readonly id: string) {}
}

export class GetForecastHandler {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(query: GetForecastQuery): Promise<Forecast> {
    return await this.forecastService.getForecast(query.id);
  }
}
