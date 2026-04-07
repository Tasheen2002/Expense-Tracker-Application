import { ISupplierRepository } from '../../domain/repositories/supplier.repository';
import { Supplier, SupplierDTO } from '../../domain/entities/supplier.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ListSuppliersQuery extends IQuery {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class ListSuppliersHandler
  implements IQueryHandler<ListSuppliersQuery, QueryResult<PaginatedResult<SupplierDTO>>>
{
  constructor(private readonly supplierRepository: ISupplierRepository) {}

  async handle(
    query: ListSuppliersQuery
  ): Promise<QueryResult<PaginatedResult<SupplierDTO>>> {
    const result = await this.supplierRepository.findByWorkspace(
      query.workspaceId,
      { limit: query.limit, offset: query.offset }
    );

    const dtoResult: PaginatedResult<SupplierDTO> = {
      items: result.items.map((s) => Supplier.toDTO(s)),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };

    return QueryResult.success(dtoResult);
  }
}
