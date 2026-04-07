import { StockService } from '../services/stock.service';
import { Stock, StockDTO } from '../../domain/entities/stock.entity';
import { TransactionType } from '../../domain/enums/transaction-type';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface AdjustStockCommand extends ICommand {
  workspaceId: string;
  variantId: string;
  locationId: string;
  quantity: number;
  type: TransactionType;
  notes?: string;
  referenceId?: string;
  referenceType?: string;
  createdBy: string;
}

export class AdjustStockHandler
  implements ICommandHandler<AdjustStockCommand, CommandResult<StockDTO>>
{
  constructor(private readonly stockService: StockService) {}

  async handle(command: AdjustStockCommand): Promise<CommandResult<StockDTO>> {
    const { stock } = await this.stockService.adjustStock(command);
    return CommandResult.success(Stock.toDTO(stock));
  }
}
