import { InventoryTransaction } from '../entities/inventory-transaction.entity';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface IInventoryTransactionRepository {
  save(transaction: InventoryTransaction): Promise<void>;
  findByFilters(
    filters: { workspaceId: string; variantId?: string; locationId?: string },
    options?: PaginationOptions
  ): Promise<PaginatedResult<InventoryTransaction>>;
}
