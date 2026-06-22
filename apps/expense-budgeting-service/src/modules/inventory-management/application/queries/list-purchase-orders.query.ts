
import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseOrderDTO } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderStatus } from '../../domain/enums/purchase-order-status';
import {
  IQuery, IQueryHandler } from '@core/application/cqrs';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';

export interface ListPurchaseOrdersQuery extends IQuery {
  readonly workspaceId: string;
  readonly status?: PurchaseOrderStatus;
  readonly supplierId?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListPurchaseOrdersHandler
  implements IQueryHandler<ListPurchaseOrdersQuery, PaginatedResult<PurchaseOrderDTO>>
{
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  async handle(query: ListPurchaseOrdersQuery): Promise<PaginatedResult<PurchaseOrderDTO>> {
    return this.purchaseOrderService.getPurchaseOrdersByWorkspace(
      query.workspaceId,
      { status: query.status, supplierId: query.supplierId },
      { limit: query.limit, offset: query.offset }
    );
  }
}
