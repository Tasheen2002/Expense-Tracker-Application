import { describe, expect, it } from 'vitest';
import {
  SupplierCreatedEvent, SupplierUpdatedEvent, SupplierDeactivatedEvent,
  SupplierActivatedEvent, SupplierDeletedEvent,
} from '../domain/entities/supplier.entity';
import {
  LocationCreatedEvent, LocationUpdatedEvent, LocationDeactivatedEvent,
  LocationActivatedEvent, LocationDeletedEvent,
} from '../domain/entities/location.entity';
import {
  StockCreatedEvent, StockLevelChangedEvent, LowStockAlertEvent, StockUpdatedEvent,
} from '../domain/entities/stock.entity';
import { InventoryTransactionRecordedEvent } from '../domain/entities/inventory-transaction.entity';
import {
  PurchaseOrderCreatedEvent, PurchaseOrderStatusChangedEvent, PurchaseOrderDeletedEvent,
  PurchaseOrderItemAddedEvent, PurchaseOrderItemRemovedEvent, PurchaseOrderItemReceivedEvent,
} from '../domain/entities/purchase-order.entity';
import { inventoryWebhookRoutes } from '../infrastructure/outbox/inventory-webhook-routes';

describe('inventory outbox webhook routes', () => {
  it('routes every inventory domain event to the audit consumer', () => {
    const eventTypes = [
      SupplierCreatedEvent, SupplierUpdatedEvent, SupplierDeactivatedEvent,
      SupplierActivatedEvent, SupplierDeletedEvent,
      LocationCreatedEvent, LocationUpdatedEvent, LocationDeactivatedEvent,
      LocationActivatedEvent, LocationDeletedEvent,
      StockCreatedEvent, StockLevelChangedEvent, LowStockAlertEvent, StockUpdatedEvent,
      InventoryTransactionRecordedEvent,
      PurchaseOrderCreatedEvent, PurchaseOrderStatusChangedEvent, PurchaseOrderDeletedEvent,
      PurchaseOrderItemAddedEvent, PurchaseOrderItemRemovedEvent, PurchaseOrderItemReceivedEvent,
    ].map((eventClass) => eventClass.prototype.eventType);
    const routes = inventoryWebhookRoutes('http://audit-service:3009');
    const auditEndpoint = 'http://audit-service:3009/api/v1/event-outbox/events';

    expect(new Set(eventTypes).size).toBe(eventTypes.length);
    expect(Object.keys(routes).sort()).toEqual(eventTypes.sort());
    for (const type of eventTypes) {
      expect(routes[type]).toEqual([auditEndpoint]);
    }
  });
});
