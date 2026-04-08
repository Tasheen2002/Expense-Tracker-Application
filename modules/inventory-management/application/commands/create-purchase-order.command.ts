import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseOrderDTO } from '../../domain/entities/purchase-order.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface CreatePurchaseOrderCommand extends ICommand {
  workspaceId: string;
  supplierId: string;
  orderDate: Date;
  expectedDate?: Date;
  notes?: string;
  currency?: string;
  createdBy: string;
}

export class CreatePurchaseOrderHandler
  implements ICommandHandler<CreatePurchaseOrderCommand, CommandResult<PurchaseOrderDTO>>
{
  constructor(private readonly poService: PurchaseOrderService) {}

  async handle(command: CreatePurchaseOrderCommand): Promise<CommandResult<PurchaseOrderDTO>> {
    const po = await this.poService.createPurchaseOrder(command);
    return CommandResult.success(po);
  }
}
