import { InventoryTransaction } from '../entities/inventory-transaction.entity';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface IInventoryTransactionRepository {
  save(transaction: InventoryTransaction): Promise<void>;
  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<InventoryTransaction>>;
  findByVariant(
    variantId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<InventoryTransaction>>;
  findByLocation(
    locationId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<InventoryTransaction>>;
}
