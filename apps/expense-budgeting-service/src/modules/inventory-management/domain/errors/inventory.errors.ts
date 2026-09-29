import { DomainError } from '@core/domain/domain-error';

export class InventoryManagementError extends DomainError {
  constructor(message: string, code: string, statusCode: number = 400) {
    super(message, code, statusCode);
  }
}

export class PurchaseOrderNotFoundError extends InventoryManagementError {
  constructor(poId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Purchase order with ID ${poId} not found in workspace ${workspaceId}`
      : `Purchase order with ID ${poId} not found`;
    super(message, 'PURCHASE_ORDER_NOT_FOUND', 404);
  }
}

export class PurchaseOrderCannotBeEditedError extends InventoryManagementError {
  constructor(status: string) {
    super(
      `Purchase order cannot be edited in ${status} status`,
      'PURCHASE_ORDER_CANNOT_BE_EDITED',
      400
    );
  }
}

export class InvalidPurchaseOrderStatusError extends InventoryManagementError {
  constructor(from: string, to: string) {
    super(
      `Cannot transition purchase order status from ${from} to ${to}`,
      'INVALID_PURCHASE_ORDER_STATUS',
      400
    );
  }
}

export class PurchaseOrderItemNotFoundError extends InventoryManagementError {
  constructor(itemId: string) {
    super(
      `Purchase order item with ID ${itemId} not found`,
      'PURCHASE_ORDER_ITEM_NOT_FOUND',
      404
    );
  }
}

export class SupplierNotFoundError extends InventoryManagementError {
  constructor(supplierId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Supplier with ID ${supplierId} not found in workspace ${workspaceId}`
      : `Supplier with ID ${supplierId} not found`;
    super(message, 'SUPPLIER_NOT_FOUND', 404);
  }
}

export class SupplierAlreadyExistsError extends InventoryManagementError {
  constructor(name: string, workspaceId: string) {
    super(
      `Supplier with name '${name}' already exists in workspace ${workspaceId}`,
      'SUPPLIER_ALREADY_EXISTS',
      409
    );
  }
}

export class PurchaseOrderCannotBeDeletedError extends InventoryManagementError {
  constructor(status: string) {
    super(`Purchase order in ${status} status cannot be deleted`, 'PURCHASE_ORDER_CANNOT_BE_DELETED', 409);
  }
}

export class SupplierInUseError extends InventoryManagementError {
  constructor(supplierId: string) {
    super(
      `Supplier ${supplierId} cannot be deleted while purchase orders reference it`,
      'SUPPLIER_IN_USE',
      409
    );
  }
}

export class SupplierInactiveError extends InventoryManagementError {
  constructor(supplierId: string) {
    super(`Supplier ${supplierId} is inactive`, 'SUPPLIER_INACTIVE', 409);
  }
}

export class LocationNotFoundError extends InventoryManagementError {
  constructor(locationId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Location with ID ${locationId} not found in workspace ${workspaceId}`
      : `Location with ID ${locationId} not found`;
    super(message, 'LOCATION_NOT_FOUND', 404);
  }
}

export class LocationAlreadyExistsError extends InventoryManagementError {
  constructor(name: string, workspaceId: string) {
    super(
      `Location with name '${name}' already exists in workspace ${workspaceId}`,
      'LOCATION_ALREADY_EXISTS',
      409
    );
  }
}

export class LocationInUseError extends InventoryManagementError {
  constructor(locationId: string) {
    super(
      `Location ${locationId} cannot be deleted while inventory references it`,
      'LOCATION_IN_USE',
      409
    );
  }
}

export class LocationInactiveError extends InventoryManagementError {
  constructor(locationId: string) {
    super(`Location ${locationId} is inactive`, 'LOCATION_INACTIVE', 409);
  }
}

export class StockNotFoundError extends InventoryManagementError {
  constructor(stockId: string, workspaceId: string) {
    super(`Stock ${stockId} not found in workspace ${workspaceId}`, 'STOCK_NOT_FOUND', 404);
  }
}

export class InsufficientStockError extends InventoryManagementError {
  constructor(available: number, requested: number) {
    super(
      `Insufficient stock: ${available} available, ${requested} requested`,
      'INSUFFICIENT_STOCK',
      400
    );
  }
}

export class InvalidQuantityError extends InventoryManagementError {
  constructor(message: string) {
    super(message, 'INVALID_QUANTITY', 400);
  }
}

export class InvalidInventoryDataError extends InventoryManagementError {
  constructor(message: string) {
    super(message, 'INVALID_INVENTORY_DATA', 400);
  }
}

export class UnauthorizedInventoryAccessError extends InventoryManagementError {
  constructor(operation: string = 'access') {
    super(
      `Unauthorized to ${operation} this inventory resource`,
      'UNAUTHORIZED_INVENTORY_ACCESS',
      403
    );
  }
}
