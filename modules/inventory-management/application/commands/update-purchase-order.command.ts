import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseOrderDTO } from '../../domain/entities/purchase-order.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface UpdatePurchaseOrderCommand extends ICommand {
  purchaseOrderId: string;
  workspaceId: string;
  notes?: string | null;
  expectedDate?: Date | null;
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
