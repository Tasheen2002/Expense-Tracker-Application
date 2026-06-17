import { ForecastService } from '../services/forecast.service';
import { ForecastDTO } from '../../domain/entities/forecast.entity';
import { ForecastType } from '../../domain/enums/forecast-type.enum';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface CreateForecastCommand extends ICommand {
  readonly planId: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly type: ForecastType;
  readonly userId: string;
}

export class CreateForecastHandler implements ICommandHandler<
  CreateForecastCommand,
  CommandResult<ForecastDTO>
> {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(
    command: CreateForecastCommand
  ): Promise<CommandResult<ForecastDTO>> {
    const forecast = await this.forecastService.createForecast({
      planId: command.planId,
      workspaceId: command.workspaceId,
      name: command.name,
      type: command.type,
      userId: command.userId,
    });
    return CommandResult.success(forecast);
  }
}
