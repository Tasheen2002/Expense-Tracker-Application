import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';
import { StockDTO } from '../../domain/entities/stock.entity';
import { StockService } from '../services/stock.service';

export interface UpdateStockSettingsCommand extends ICommand {
  readonly stockId: string;
  readonly workspaceId: string;
  readonly reorderLevel?: number;
  readonly reorderQuantity?: number;
}

export class UpdateStockSettingsHandler
  implements ICommandHandler<UpdateStockSettingsCommand, CommandResult<StockDTO>>
{
  constructor(private readonly stockService: StockService) {}

  async handle(command: UpdateStockSettingsCommand): Promise<CommandResult<StockDTO>> {
    const stock = await this.stockService.updateStockSettings(
      command.stockId,
      command.workspaceId,
      {
        reorderLevel: command.reorderLevel,
        reorderQuantity: command.reorderQuantity,
      }
    );
    return CommandResult.success(stock);
  }
}
