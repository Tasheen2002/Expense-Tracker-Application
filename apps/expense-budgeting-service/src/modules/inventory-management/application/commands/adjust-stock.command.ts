import { StockService } from '../services/stock.service';
import { StockDTO } from '../../domain/entities/stock.entity';
import { InventoryTransactionDTO } from '../../domain/entities/inventory-transaction.entity';
import { TransactionType } from '../../domain/enums/transaction-type';
import {
  ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';



export interface AdjustStockCommand extends ICommand {
  readonly workspaceId: string;
  readonly variantId: string;
  readonly locationId: string;
  readonly quantity: number;
  readonly type: TransactionType;
  readonly notes?: string;
  readonly referenceId?: string;
  readonly referenceType?: string;
  readonly createdBy: string;
}

export interface AdjustStockResult {
  readonly stock: StockDTO;
  readonly transaction: InventoryTransactionDTO;
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
