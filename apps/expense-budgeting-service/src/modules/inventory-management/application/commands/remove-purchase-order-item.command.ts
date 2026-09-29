import { PurchaseOrderService } from '../services/purchase-order.service';
import {
  ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';



export interface RemovePurchaseOrderItemCommand extends ICommand {
  readonly itemId: string;
  readonly purchaseOrderId: string;
  readonly workspaceId: string;
}

export class RemovePurchaseOrderItemHandler
  implements ICommandHandler<RemovePurchaseOrderItemCommand, CommandResult<void>>
{
  constructor(private readonly poService: PurchaseOrderService) {}

  async handle(command: RemovePurchaseOrderItemCommand): Promise<CommandResult<void>> {
    await this.poService.removeItem(command.itemId, command.purchaseOrderId, command.workspaceId);
    return CommandResult.success(undefined);
  }
}
