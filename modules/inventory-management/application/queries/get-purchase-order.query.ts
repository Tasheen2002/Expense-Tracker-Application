import { IPurchaseOrderRepository } from '../../domain/repositories/purchase-order.repository';
import { PurchaseOrder, PurchaseOrderDTO } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderItem, PurchaseOrderItemDTO } from '../../domain/entities/purchase-order-item.entity';
import { PurchaseOrderId } from '../../domain/value-objects/purchase-order-id.vo';
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
  constructor(private readonly poRepository: IPurchaseOrderRepository) {}

  async handle(
    query: GetPurchaseOrderQuery
  ): Promise<QueryResult<PurchaseOrderWithItemsDTO>> {
    const po = await this.poRepository.findById(
      PurchaseOrderId.fromString(query.purchaseOrderId),
      query.workspaceId
    );
    if (!po) {
      throw new PurchaseOrderNotFoundError(query.purchaseOrderId, query.workspaceId);
    }

    const items = await this.poRepository.findItemsByPurchaseOrder(
      query.purchaseOrderId
    );

    const dto: PurchaseOrderWithItemsDTO = {
      ...PurchaseOrder.toDTO(po),
      items: items.map((item) => PurchaseOrderItem.toDTO(item)),
    };

    return QueryResult.success(dto);
  }
}
