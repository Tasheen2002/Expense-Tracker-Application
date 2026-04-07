import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseOrderDTO } from '../../domain/entities/purchase-order.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface CancelPurchaseOrderCommand extends ICommand {
  purchaseOrderId: string;
  workspaceId: string;
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
