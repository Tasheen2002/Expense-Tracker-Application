import { SupplierService } from '../services/supplier.service';
import { SupplierDTO } from '../../domain/entities/supplier.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ListSuppliersQuery extends IQuery {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class ListSuppliersHandler
  implements IQueryHandler<ListSuppliersQuery, PaginatedResult<SupplierDTO>>
{
  constructor(private readonly supplierService: SupplierService) {}

  async handle(query: ListSuppliersQuery): Promise<PaginatedResult<SupplierDTO>> {
    return this.supplierService.getSuppliersByWorkspace(
      query.workspaceId,
      { limit: query.limit, offset: query.offset }
    );
  }
}
