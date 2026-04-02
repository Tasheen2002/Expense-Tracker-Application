import { ForecastService } from '../services/forecast.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface AddForecastItemCommand extends ICommand {
  forecastId: string;
  categoryId: string;
  amount: number;
  userId: string;
  notes?: string;
}

export class AddForecastItemHandler implements ICommandHandler<
  AddForecastItemCommand,
  CommandResult<{ forecastItemId: string }>
> {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(
    command: AddForecastItemCommand
  ): Promise<CommandResult<{ forecastItemId: string }>> {
    const item = await this.forecastService.addForecastItem({
      forecastId: command.forecastId,
      categoryId: command.categoryId,
      amount: command.amount,
      notes: command.notes,
      userId: command.userId,
    });
    return CommandResult.success({ forecastItemId: item.getId().getValue() });
  }
}
