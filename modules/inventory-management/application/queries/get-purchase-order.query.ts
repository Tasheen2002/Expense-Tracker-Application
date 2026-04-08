import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseOrderDTO } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderItemDTO } from '../../domain/entities/purchase-order-item.entity';
import { PurchaseOrderNotFoundError } from '../../domain/errors/inventory.errors';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetPurchaseOrderQuery extends IQuery {
  purchaseOrderId: string;
  workspaceId: string;
}

export interface PurchaseOrderWithItemsDTO extends PurchaseOrderDTO {
  items: PurchaseOrderItemDTO[];
}

export class GetPurchaseOrderHandler
  implements IQueryHandler<GetPurchaseOrderQuery, QueryResult<PurchaseOrderWithItemsDTO>>
{
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  async handle(
    query: GetPurchaseOrderQuery
  ): Promise<QueryResult<PurchaseOrderWithItemsDTO>> {
    const poDTO = await this.purchaseOrderService.getPurchaseOrderById(
      query.purchaseOrderId,
      query.workspaceId
    );
    if (!poDTO) {
      throw new PurchaseOrderNotFoundError(query.purchaseOrderId, query.workspaceId);
    }

    const items = await this.purchaseOrderService.getItemsByPurchaseOrder(
      query.purchaseOrderId
    );

    return QueryResult.success({ ...poDTO, items });
  }
}
