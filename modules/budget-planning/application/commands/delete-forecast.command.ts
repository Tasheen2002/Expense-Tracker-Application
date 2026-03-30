import { ForecastService } from '../services/forecast.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface DeleteForecastCommand extends ICommand {
  id: string;
  userId: string;
}

export class DeleteForecastHandler implements ICommandHandler<
  DeleteForecastCommand,
  CommandResult<void>
> {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(command: DeleteForecastCommand): Promise<CommandResult<void>> {
    await this.forecastService.deleteForecast(command.id, command.userId);
    return CommandResult.success();
  }
}

export interface DeleteForecastItemCommand extends ICommand {
  itemId: string;
  userId: string;
}

export class DeleteForecastItemHandler implements ICommandHandler<
  DeleteForecastItemCommand,
  CommandResult<void>
> {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(
    command: DeleteForecastItemCommand
  ): Promise<CommandResult<void>> {
    await this.forecastService.deleteForecastItem(
      command.itemId,
      command.userId
    );
    return CommandResult.success();
  }
}
