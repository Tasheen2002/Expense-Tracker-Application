import { ForecastService } from '../services/forecast.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface DeleteForecastCommand extends ICommand {
  readonly id: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class DeleteForecastHandler implements ICommandHandler<
  DeleteForecastCommand,
  CommandResult<void>
> {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(command: DeleteForecastCommand): Promise<CommandResult<void>> {
    await this.forecastService.deleteForecast(command.id, command.workspaceId, command.userId);
    return CommandResult.success();
  }
}

export interface DeleteForecastItemCommand extends ICommand {
  readonly itemId: string;
  readonly workspaceId: string;
  readonly userId: string;
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
      command.workspaceId,
      command.userId
    );
    return CommandResult.success();
  }
}
