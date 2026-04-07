import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseOrderItem, PurchaseOrderItemDTO } from '../../domain/entities/purchase-order-item.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface AddPurchaseOrderItemCommand extends ICommand {
  purchaseOrderId: string;
  workspaceId: string;
  variantId: string;
  variantName: string;
  quantity: number;
  unitPrice: number | string;
}

export class AddPurchaseOrderItemHandler
  implements ICommandHandler<AddPurchaseOrderItemCommand, CommandResult<PurchaseOrderItemDTO>>
{
  constructor(private readonly poService: PurchaseOrderService) {}

  async handle(command: AddPurchaseOrderItemCommand): Promise<CommandResult<PurchaseOrderItemDTO>> {
    const item = await this.poService.addItem(command);
    return CommandResult.success(PurchaseOrderItem.toDTO(item));
  }
}
