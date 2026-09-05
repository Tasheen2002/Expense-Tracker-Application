import { PurchaseOrderService } from '../services/purchase-order.service';
import {
  ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';



export interface DeletePurchaseOrderCommand extends ICommand {
  readonly purchaseOrderId: string;
  readonly workspaceId: string;
}

export class DeletePurchaseOrderHandler
  implements ICommandHandler<DeletePurchaseOrderCommand, CommandResult<void>>
{
  constructor(private readonly poService: PurchaseOrderService) {}

  async handle(command: DeletePurchaseOrderCommand): Promise<CommandResult<void>> {
    await this.poService.deletePurchaseOrder(
      command.purchaseOrderId,
      command.workspaceId
    );
    return CommandResult.success(undefined);
  }
}
