import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseOrderDTO } from '../../domain/entities/purchase-order.entity';
import {
  ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';



export interface CancelPurchaseOrderCommand extends ICommand {
  readonly purchaseOrderId: string;
  readonly workspaceId: string;
}

export class CancelPurchaseOrderHandler
  implements ICommandHandler<CancelPurchaseOrderCommand, CommandResult<PurchaseOrderDTO>>
{
  constructor(private readonly poService: PurchaseOrderService) {}

  async handle(command: CancelPurchaseOrderCommand): Promise<CommandResult<PurchaseOrderDTO>> {
    const po = await this.poService.cancelPurchaseOrder(
      command.purchaseOrderId,
      command.workspaceId
    );
    return CommandResult.success(po);
  }
}
