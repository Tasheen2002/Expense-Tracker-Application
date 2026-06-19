import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseOrderDTO } from '../../domain/entities/purchase-order.entity';
import {
  ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';



export interface CreatePurchaseOrderCommand extends ICommand {
  readonly workspaceId: string;
  readonly supplierId: string;
  readonly orderDate: Date;
  readonly expectedDate?: Date;
  readonly notes?: string;
  readonly currency?: string;
  readonly createdBy: string;
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
