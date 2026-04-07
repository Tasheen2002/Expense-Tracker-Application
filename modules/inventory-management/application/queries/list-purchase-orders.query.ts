import { IPurchaseOrderRepository } from '../../domain/repositories/purchase-order.repository';
import { PurchaseOrder, PurchaseOrderDTO } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderStatus } from '../../domain/enums/purchase-order-status';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ListPurchaseOrdersQuery extends IQuery {
  workspaceId: string;
  status?: PurchaseOrderStatus;
  supplierId?: string;
  limit?: number;
  offset?: number;
}

export class ListPurchaseOrdersHandler
  implements IQueryHandler<ListPurchaseOrdersQuery, QueryResult<PaginatedResult<PurchaseOrderDTO>>>
{
  constructor(private readonly poRepository: IPurchaseOrderRepository) {}

  async handle(
    query: ListPurchaseOrdersQuery
  ): Promise<QueryResult<PaginatedResult<PurchaseOrderDTO>>> {
    const hasFilters = query.status || query.supplierId;

    const result = hasFilters
      ? await this.poRepository.findByFilters(
          {
            workspaceId: query.workspaceId,
            status: query.status,
            supplierId: query.supplierId,
          },
          { limit: query.limit, offset: query.offset }
        )
      : await this.poRepository.findByWorkspace(query.workspaceId, {
          limit: query.limit,
          offset: query.offset,
        });

    const dtoResult: PaginatedResult<PurchaseOrderDTO> = {
      items: result.items.map((po) => PurchaseOrder.toDTO(po)),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };

    return QueryResult.success(dtoResult);
  }
}
