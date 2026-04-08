import { StockService } from '../services/stock.service';
import { StockDTO } from '../../domain/entities/stock.entity';
import { InventoryTransactionDTO } from '../../domain/entities/inventory-transaction.entity';
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

export interface AdjustStockResult {
  stock: StockDTO;
  transaction: InventoryTransactionDTO;
}

export class AdjustStockHandler
  implements ICommandHandler<AdjustStockCommand, CommandResult<AdjustStockResult>>
{
  constructor(private readonly stockService: StockService) {}

  async handle(command: AdjustStockCommand): Promise<CommandResult<AdjustStockResult>> {
    const result = await this.stockService.adjustStock(command);
    return CommandResult.success(result);
  }
}
