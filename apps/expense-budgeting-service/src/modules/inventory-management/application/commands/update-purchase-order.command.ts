import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseOrderDTO } from '../../domain/entities/purchase-order.entity';
import {
  ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';



export interface UpdatePurchaseOrderCommand extends ICommand {
  readonly purchaseOrderId: string;
  readonly workspaceId: string;
  readonly notes?: string | null;
  readonly expectedDate?: Date | null;
}

export class UpdatePurchaseOrderHandler
  implements ICommandHandler<UpdatePurchaseOrderCommand, CommandResult<PurchaseOrderDTO>>
{
  constructor(private readonly poService: PurchaseOrderService) {}

  async handle(command: UpdatePurchaseOrderCommand): Promise<CommandResult<PurchaseOrderDTO>> {
    const po = await this.poService.updatePurchaseOrder(
      command.purchaseOrderId,
      command.workspaceId,
      {
        notes: command.notes,
        expectedDate: command.expectedDate,
      }
    );
    return CommandResult.success(po);
  }
}
