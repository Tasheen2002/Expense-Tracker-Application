import { ForecastService } from '../services/forecast.service';
import { ForecastType } from '../../domain/enums/forecast-type.enum';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface CreateForecastCommand extends ICommand {
  planId: string;
  name: string;
  type: ForecastType;
  userId: string;
}

export class CreateForecastHandler implements ICommandHandler<
  CreateForecastCommand,
  CommandResult<{ forecastId: string }>
> {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(
    command: CreateForecastCommand
  ): Promise<CommandResult<{ forecastId: string }>> {
    const forecast = await this.forecastService.createForecast({
      planId: command.planId,
      name: command.name,
      type: command.type,
      userId: command.userId,
    });
    return CommandResult.success({ forecastId: forecast.getId().getValue() });
  }
}
