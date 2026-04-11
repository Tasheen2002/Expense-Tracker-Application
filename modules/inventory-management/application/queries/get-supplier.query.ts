import { SupplierService } from '../services/supplier.service';
import { SupplierDTO } from '../../domain/entities/supplier.entity';
import { SupplierNotFoundError } from '../../domain/errors/inventory.errors';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetSupplierQuery extends IQuery {
  supplierId: string;
  workspaceId: string;
}

export class GetSupplierHandler
  implements IQueryHandler<GetSupplierQuery, SupplierDTO>
{
  constructor(private readonly supplierService: SupplierService) {}

  async handle(query: GetSupplierQuery): Promise<SupplierDTO> {
    const dto = await this.supplierService.getSupplierById(
      query.supplierId,
      query.workspaceId
    );
    if (!dto) {
      throw new SupplierNotFoundError(query.supplierId, query.workspaceId);
    }
    return dto;
  }
}
