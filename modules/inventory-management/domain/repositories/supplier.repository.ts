import { Supplier } from '../entities/supplier.entity';
import { SupplierId } from '../value-objects/supplier-id.vo';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ISupplierRepository {
  save(supplier: Supplier): Promise<void>;
  findById(id: SupplierId, workspaceId: string): Promise<Supplier | null>;
  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Supplier>>;
  delete(id: SupplierId, workspaceId: string): Promise<void>;
  exists(id: SupplierId, workspaceId: string): Promise<boolean>;
  existsByName(name: string, workspaceId: string): Promise<boolean>;
}
