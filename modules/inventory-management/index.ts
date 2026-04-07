// HTTP entry-point (used by the API app to mount routes)
export { registerInventoryRoutes } from './infrastructure/http/routes';

// Domain error types (used by cross-cutting error handlers)
export {
  PurchaseOrderNotFoundError,
  SupplierNotFoundError,
  LocationNotFoundError,
  StockNotFoundError,
  InsufficientStockError,
  InvalidQuantityError,
  InvalidPurchaseOrderStatusError,
  PurchaseOrderCannotBeEditedError,
  SupplierAlreadyExistsError,
  LocationAlreadyExistsError,
  InvalidInventoryDataError,
  UnauthorizedInventoryAccessError,
} from './domain/errors/inventory.errors';

// Domain enums (safe to share — value objects, not entities)
export { PurchaseOrderStatus } from './domain/enums/purchase-order-status';
export { LocationType } from './domain/enums/location-type';
export { TransactionType } from './domain/enums/transaction-type';

// Domain value objects (for cross-module identity references)
export { StockId } from './domain/value-objects/stock-id.vo';
export { PurchaseOrderId } from './domain/value-objects/purchase-order-id.vo';
export { SupplierId } from './domain/value-objects/supplier-id.vo';
export { LocationId } from './domain/value-objects/location-id.vo';

// DTO types (for cross-module type sharing)
export type { SupplierDTO } from './domain/entities/supplier.entity';
export type { LocationDTO } from './domain/entities/location.entity';
export type { PurchaseOrderDTO } from './domain/entities/purchase-order.entity';
export type { PurchaseOrderItemDTO } from './domain/entities/purchase-order-item.entity';
export type { StockDTO } from './domain/entities/stock.entity';
export type { InventoryTransactionDTO } from './domain/entities/inventory-transaction.entity';
