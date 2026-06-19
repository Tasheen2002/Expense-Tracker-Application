import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseOrderItemDTO } from '../../domain/entities/purchase-order-item.entity';
import {
  ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface AddPurchaseOrderItemCommand extends ICommand {
  readonly purchaseOrderId: string;
  readonly workspaceId: string;
  readonly variantId: string;
  readonly variantName: string;
  readonly quantity: number;
  readonly unitPrice: number | string;
}

export class AddPurchaseOrderItemHandler
  implements ICommandHandler<AddPurchaseOrderItemCommand, CommandResult<PurchaseOrderItemDTO>>
{
  constructor(private readonly poService: PurchaseOrderService) {}

  async handle(command: AddPurchaseOrderItemCommand): Promise<CommandResult<PurchaseOrderItemDTO>> {
    const item = await this.poService.addItem(command);
    return CommandResult.success(item);
  }
}
