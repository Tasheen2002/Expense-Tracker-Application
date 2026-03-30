/**
 * Inventory Management Domain Errors
 */

export class PurchaseOrderNotFoundError extends Error {
  constructor(poId: string) {
    super(`Purchase order with ID ${poId} not found`);
    this.name = "PurchaseOrderNotFoundError";
  }
}

export class PurchaseOrderCannotBeEditedError extends Error {
  constructor(status: string) {
    super(`Purchase order cannot be edited in ${status} status`);
    this.name = "PurchaseOrderCannotBeEditedError";
  }
}

export class PurchaseOrderItemAlreadyExistsError extends Error {
  constructor(variantId: string) {
    super(`Item with variant ID ${variantId} already exists in this purchase order`);
    this.name = "PurchaseOrderItemAlreadyExistsError";
  }
}

export class PurchaseOrderItemNotFoundError extends Error {
  constructor(variantId: string) {
    super(`Item with variant ID ${variantId} not found in purchase order`);
    this.name = "PurchaseOrderItemNotFoundError";
  }
}

export class StockNotFoundError extends Error {
  constructor(variantId: string, locationId: string) {
    super(`Stock not found for variant ${variantId} at location ${locationId}`);
    this.name = "StockNotFoundError";
  }
}

export class InsufficientStockError extends Error {
  constructor(available: number, requested: number) {
    super(`Insufficient stock: ${available} available, ${requested} requested`);
    this.name = "InsufficientStockError";
  }
}

export class LocationNotFoundError extends Error {
  constructor(locationId: string) {
    super(`Location with ID ${locationId} not found`);
    this.name = "LocationNotFoundError";
  }
}

export class SupplierNotFoundError extends Error {
  constructor(supplierId: string) {
    super(`Supplier with ID ${supplierId} not found`);
    this.name = "SupplierNotFoundError";
  }
}

export class StockAlertNotFoundError extends Error {
  constructor(alertId: string) {
    super(`Stock alert with ID ${alertId} not found`);
    this.name = "StockAlertNotFoundError";
  }
}

export class ReservationNotFoundError extends Error {
  constructor(reservationId: string) {
    super(`Pickup reservation with ID ${reservationId} not found`);
    this.name = "ReservationNotFoundError";
  }
}

export class ReservationExpiredError extends Error {
  constructor(reservationId: string) {
    super(`Reservation ${reservationId} has expired`);
    this.name = "ReservationExpiredError";
  }
}
