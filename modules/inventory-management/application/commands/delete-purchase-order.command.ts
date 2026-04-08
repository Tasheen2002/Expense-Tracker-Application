import { PurchaseOrderService } from '../services/purchase-order.service';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface DeletePurchaseOrderCommand extends ICommand {
  purchaseOrderId: string;
  workspaceId: string;
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
