// HTTP entry-point (used by the API app to mount routes)
export { registerInventoryRoutes } from './infrastructure/http/routes';

// Domain error types (used by cross-cutting error handlers)
export {
  InventoryManagementError,
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
} from './domain/errors/inventory.errors';

// Domain enums (safe to share — value objects, not entities)
export { PurchaseOrderStatus } from './domain/enums/purchase-order-status';
export { LocationType } from './domain/enums/location-type';
export { TransactionType } from './domain/enums/transaction-type';

// DTO types (for cross-module type sharing)
export type { SupplierDTO } from './domain/entities/supplier.entity';
export type { LocationDTO } from './domain/entities/location.entity';
export type { PurchaseOrderDTO } from './domain/entities/purchase-order.entity';
export type { PurchaseOrderItemDTO } from './domain/entities/purchase-order-item.entity';
export type { StockDTO } from './domain/entities/stock.entity';
export type { InventoryTransactionDTO } from './domain/entities/inventory-transaction.entity';

// Application services (for DI container wiring)
export { SupplierService } from './application/services/supplier.service';
export { LocationService } from './application/services/location.service';
export { PurchaseOrderService } from './application/services/purchase-order.service';
export { StockService } from './application/services/stock.service';

// Command handlers
export { CreateSupplierHandler } from './application/commands/create-supplier.command';
export { UpdateSupplierHandler } from './application/commands/update-supplier.command';
export { DeleteSupplierHandler } from './application/commands/delete-supplier.command';
export { CreateLocationHandler } from './application/commands/create-location.command';
export { UpdateLocationHandler } from './application/commands/update-location.command';
export { DeleteLocationHandler } from './application/commands/delete-location.command';
export { CreatePurchaseOrderHandler } from './application/commands/create-purchase-order.command';
export { UpdatePurchaseOrderHandler } from './application/commands/update-purchase-order.command';
export { DeletePurchaseOrderHandler } from './application/commands/delete-purchase-order.command';
export { SubmitPurchaseOrderHandler } from './application/commands/submit-purchase-order.command';
export { ApprovePurchaseOrderHandler } from './application/commands/approve-purchase-order.command';
export { ReceivePurchaseOrderHandler } from './application/commands/receive-purchase-order.command';
export { CancelPurchaseOrderHandler } from './application/commands/cancel-purchase-order.command';
export { AddPurchaseOrderItemHandler } from './application/commands/add-purchase-order-item.command';
export { RemovePurchaseOrderItemHandler } from './application/commands/remove-purchase-order-item.command';
export { AdjustStockHandler } from './application/commands/adjust-stock.command';

// Query handlers
export { GetSupplierHandler } from './application/queries/get-supplier.query';
export { ListSuppliersHandler } from './application/queries/list-suppliers.query';
export { GetLocationHandler } from './application/queries/get-location.query';
export { ListLocationsHandler } from './application/queries/list-locations.query';
export { GetPurchaseOrderHandler } from './application/queries/get-purchase-order.query';
export { ListPurchaseOrdersHandler } from './application/queries/list-purchase-orders.query';
export { GetStockHandler } from './application/queries/get-stock.query';
export { ListTransactionsHandler } from './application/queries/list-transactions.query';
