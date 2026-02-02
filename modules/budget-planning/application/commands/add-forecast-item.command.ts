import { ForecastService } from "../services/forecast.service";
import { ForecastItem } from "../../domain/entities/forecast-item.entity";

export class AddForecastItemCommand {
  constructor(
    public readonly forecastId: string,
    public readonly categoryId: string,
    public readonly amount: number,
    public readonly userId: string,
    public readonly notes?: string,
  ) {}
}

export class AddForecastItemHandler {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(command: AddForecastItemCommand): Promise<ForecastItem> {
    return await this.forecastService.addForecastItem({
      forecastId: command.forecastId,
      categoryId: command.categoryId,
      amount: command.amount,
      notes: command.notes,
      userId: command.userId,
    });
  }
}
