import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseOrder, PurchaseOrderDTO } from '../../domain/entities/purchase-order.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface ApprovePurchaseOrderCommand extends ICommand {
  purchaseOrderId: string;
  workspaceId: string;
}

export class ApprovePurchaseOrderHandler
  implements ICommandHandler<ApprovePurchaseOrderCommand, CommandResult<PurchaseOrderDTO>>
{
  constructor(private readonly poService: PurchaseOrderService) {}

  async handle(command: ApprovePurchaseOrderCommand): Promise<CommandResult<PurchaseOrderDTO>> {
    const po = await this.poService.approvePurchaseOrder(
      command.purchaseOrderId,
      command.workspaceId
    );
    return CommandResult.success(PurchaseOrder.toDTO(po));
  }
}
