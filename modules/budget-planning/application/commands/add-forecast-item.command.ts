import { ForecastService } from '../services/forecast.service';
import { ForecastItemDTO } from '../../domain/entities/forecast-item.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface AddForecastItemCommand extends ICommand {
  forecastId: string;
  workspaceId: string;
  categoryId: string;
  amount: number;
  userId: string;
  notes?: string;
}

export class AddForecastItemHandler implements ICommandHandler<
  AddForecastItemCommand,
  CommandResult<ForecastItemDTO>
> {
  constructor(private readonly forecastService: ForecastService) {}

  async handle(
    command: AddForecastItemCommand
  ): Promise<CommandResult<ForecastItemDTO>> {
    const item = await this.forecastService.addForecastItem({
      forecastId: command.forecastId,
      workspaceId: command.workspaceId,
      categoryId: command.categoryId,
      amount: command.amount,
      notes: command.notes,
      userId: command.userId,
    });
    return CommandResult.success(item);
  }
}
