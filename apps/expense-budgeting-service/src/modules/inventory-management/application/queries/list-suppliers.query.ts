
import { SupplierService } from '../services/supplier.service';
import { SupplierDTO } from '../../domain/entities/supplier.entity';
import {
  IQuery, IQueryHandler } from '@core/application/cqrs';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';

export interface ListSuppliersQuery extends IQuery {
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
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
