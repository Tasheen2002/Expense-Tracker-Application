import { PurchaseOrderService } from '../services/purchase-order.service';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface RemovePurchaseOrderItemCommand extends ICommand {
  itemId: string;
  workspaceId: string;
}

export class RemovePurchaseOrderItemHandler
  implements ICommandHandler<RemovePurchaseOrderItemCommand, CommandResult<void>>
{
  constructor(private readonly poService: PurchaseOrderService) {}

  async handle(command: RemovePurchaseOrderItemCommand): Promise<CommandResult<void>> {
    await this.poService.removeItem(command.itemId, command.workspaceId);
    return CommandResult.success(undefined);
  }
}
