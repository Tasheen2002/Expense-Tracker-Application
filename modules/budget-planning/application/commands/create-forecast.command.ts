import { ForecastService } from "../services/forecast.service";
import { Forecast } from "../../domain/entities/forecast.entity";
import { ForecastType } from "../../domain/enums/forecast-type.enum";

export class CreateForecastCommand {
  constructor(
    public readonly planId: string,
    public readonly name: string,
    public readonly type: ForecastType,
  ) {}
}

export class CreateForecastHandler {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(command: CreateForecastCommand): Promise<Forecast> {
    return await this.forecastService.createForecast({
      planId: command.planId,
      name: command.name,
      type: command.type,
    });
  }
}
