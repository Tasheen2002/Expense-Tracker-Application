import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { PurchaseOrderId } from '../value-objects/purchase-order-id.vo';
import { PurchaseOrderItemId } from '../value-objects/purchase-order-item-id.vo';
import { PurchaseOrderStatus } from '../enums/purchase-order-status';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface PurchaseOrderFilters {
  workspaceId: string;
  status?: PurchaseOrderStatus;
  supplierId?: string;
}

export interface IPurchaseOrderRepository {
  save(po: PurchaseOrder): Promise<void>;
  findById(id: PurchaseOrderId, workspaceId: string): Promise<PurchaseOrder | null>;
  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PurchaseOrder>>;
  findByFilters(
    filters: PurchaseOrderFilters,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PurchaseOrder>>;
  delete(id: PurchaseOrderId, workspaceId: string): Promise<void>;
  exists(id: PurchaseOrderId, workspaceId: string): Promise<boolean>;

  // Item operations
  saveItem(item: PurchaseOrderItem): Promise<void>;
  findItemById(id: PurchaseOrderItemId): Promise<PurchaseOrderItem | null>;
  findItemsByPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderItem[]>;
  deleteItem(id: PurchaseOrderItemId): Promise<void>;
}
