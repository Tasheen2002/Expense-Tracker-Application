import { DomainError } from '../../../../packages/core/src/domain/domain-error';

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

export class StockNotFoundError extends InventoryManagementError {
  constructor(variantId: string, locationId: string) {
    super(
      `Stock not found for variant ${variantId} at location ${locationId}`,
      'STOCK_NOT_FOUND',
      404
    );
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
