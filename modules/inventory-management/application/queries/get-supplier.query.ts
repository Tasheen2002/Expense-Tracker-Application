import { SupplierService } from '../services/supplier.service';
import { SupplierDTO } from '../../domain/entities/supplier.entity';
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
  constructor(private readonly supplierService: SupplierService) {}

  async handle(query: GetSupplierQuery): Promise<QueryResult<SupplierDTO>> {
    const dto = await this.supplierService.getSupplierById(
      query.supplierId,
      query.workspaceId
    );
    if (!dto) {
      throw new SupplierNotFoundError(query.supplierId, query.workspaceId);
    }
    return QueryResult.success(dto);
  }
}
