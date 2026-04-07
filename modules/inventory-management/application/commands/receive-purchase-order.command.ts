import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseOrder, PurchaseOrderDTO } from '../../domain/entities/purchase-order.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface ReceivePurchaseOrderCommand extends ICommand {
  purchaseOrderId: string;
  workspaceId: string;
}

export class ReceivePurchaseOrderHandler
  implements ICommandHandler<ReceivePurchaseOrderCommand, CommandResult<PurchaseOrderDTO>>
{
  constructor(private readonly poService: PurchaseOrderService) {}

  async handle(command: ReceivePurchaseOrderCommand): Promise<CommandResult<PurchaseOrderDTO>> {
    const po = await this.poService.receivePurchaseOrder(
      command.purchaseOrderId,
      command.workspaceId
    );
    return CommandResult.success(PurchaseOrder.toDTO(po));
  }
}
