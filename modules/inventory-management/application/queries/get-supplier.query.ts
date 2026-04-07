import { ISupplierRepository } from '../../domain/repositories/supplier.repository';
import { Supplier, SupplierDTO } from '../../domain/entities/supplier.entity';
import { SupplierId } from '../../domain/value-objects/supplier-id.vo';
import { SupplierNotFoundError } from '../../domain/errors/inventory.errors';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetSupplierQuery extends IQuery {
  supplierId: string;
  workspaceId: string;
}

export class GetSupplierHandler
  implements IQueryHandler<GetSupplierQuery, QueryResult<SupplierDTO>>
{
  constructor(private readonly supplierRepository: ISupplierRepository) {}

  async handle(query: GetSupplierQuery): Promise<QueryResult<SupplierDTO>> {
    const supplier = await this.supplierRepository.findById(
      SupplierId.fromString(query.supplierId),
      query.workspaceId
    );
    if (!supplier) {
      throw new SupplierNotFoundError(query.supplierId, query.workspaceId);
    }
    return QueryResult.success(Supplier.toDTO(supplier));
  }
}
