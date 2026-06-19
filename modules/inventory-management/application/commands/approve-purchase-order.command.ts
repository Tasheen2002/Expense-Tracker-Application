import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseOrderDTO } from '../../domain/entities/purchase-order.entity';
import {
  ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';



export interface ApprovePurchaseOrderCommand extends ICommand {
  readonly purchaseOrderId: string;
  readonly workspaceId: string;
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
    return CommandResult.success(po);
  }
}
