import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseOrderDTO } from '../../domain/entities/purchase-order.entity';
import {
  ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';



export interface SubmitPurchaseOrderCommand extends ICommand {
  readonly purchaseOrderId: string;
  readonly workspaceId: string;
}

export class SubmitPurchaseOrderHandler
  implements ICommandHandler<SubmitPurchaseOrderCommand, CommandResult<PurchaseOrderDTO>>
{
  constructor(private readonly poService: PurchaseOrderService) {}

  async handle(command: SubmitPurchaseOrderCommand): Promise<CommandResult<PurchaseOrderDTO>> {
    const po = await this.poService.submitPurchaseOrder(
      command.purchaseOrderId,
      command.workspaceId
    );
    return CommandResult.success(po);
  }
}
