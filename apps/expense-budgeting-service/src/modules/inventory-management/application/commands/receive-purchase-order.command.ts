import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseOrderDTO } from '../../domain/entities/purchase-order.entity';
import {
  ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';



export interface ReceivePurchaseOrderCommand extends ICommand {
  readonly purchaseOrderId: string;
  readonly workspaceId: string;
  readonly locationId: string;
  readonly receivedBy: string;
}

export class ReceivePurchaseOrderHandler
  implements ICommandHandler<ReceivePurchaseOrderCommand, CommandResult<PurchaseOrderDTO>>
{
  constructor(private readonly poService: PurchaseOrderService) {}

  async handle(command: ReceivePurchaseOrderCommand): Promise<CommandResult<PurchaseOrderDTO>> {
    const po = await this.poService.receivePurchaseOrder(
      command.purchaseOrderId,
      command.workspaceId,
      command.locationId,
      command.receivedBy
    );
    return CommandResult.success(po);
  }
}
