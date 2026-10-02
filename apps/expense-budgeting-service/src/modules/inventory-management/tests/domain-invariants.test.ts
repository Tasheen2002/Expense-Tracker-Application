import { describe, expect, it } from 'vitest';
import { Location } from '../domain/entities/location.entity';
import { Supplier } from '../domain/entities/supplier.entity';
import { Stock } from '../domain/entities/stock.entity';
import { LocationType } from '../domain/enums/location-type';
import { PurchaseOrderItem } from '../domain/entities/purchase-order-item.entity';
import { PurchaseOrder } from '../domain/entities/purchase-order.entity';
import { InventoryTransaction } from '../domain/entities/inventory-transaction.entity';
import { TransactionType } from '../domain/enums/transaction-type';
import { PurchaseOrderStatus, isValidStatusTransition } from '../domain/enums/purchase-order-status';
import { InvalidInventoryDataError, InvalidQuantityError } from '../domain/errors/inventory.errors';

describe('inventory domain invariants', () => {
  const workspaceId = '123e4567-e89b-42d3-a456-426614174000';
  const locationId = '123e4567-e89b-42d3-a456-426614174002';
  const actorId = '123e4567-e89b-42d3-a456-426614174003';
  it('validates location names on update and avoids duplicate activation events', () => {
    const location = Location.create({ workspaceId, name: 'Main', type: LocationType.WAREHOUSE });
    expect(() => location.updateName('x'.repeat(256))).toThrow(InvalidInventoryDataError);
    location.clearDomainEvents();
    location.activate();
    expect(location.domainEvents).toHaveLength(0);
    location.deactivate();
    location.deactivate();
    expect(location.domainEvents).toHaveLength(1);
  });

  it('rejects invalid item amounts and over-receiving', () => {
    const data = { purchaseOrderId: '123e4567-e89b-42d3-a456-426614174004', variantId: 'variant', variantName: 'Widget', quantity: 3, unitPrice: 1.25 };
    expect(() => PurchaseOrderItem.create({ ...data, quantity: 0.5 })).toThrow(InvalidQuantityError);
    expect(() => PurchaseOrderItem.create({ ...data, unitPrice: NaN })).toThrow(InvalidInventoryDataError);
    expect(() => PurchaseOrderItem.create({ ...data, unitPrice: 1.001 })).toThrow(InvalidInventoryDataError);
    const item = PurchaseOrderItem.create(data);
    expect(item.getLineTotal()).toBe(3.75);
  });

  it('rejects invalid transaction quantities and types', () => {
    const data = { workspaceId, variantId: 'variant', locationId, type: TransactionType.IN, quantity: 2, createdBy: actorId };
    expect(() => InventoryTransaction.create({ ...data, quantity: Infinity })).toThrow(InvalidQuantityError);
    expect(() => InventoryTransaction.create({ ...data, quantity: 1.5 })).toThrow(InvalidQuantityError);
    expect(() => InventoryTransaction.create({ ...data, type: 'BAD' as TransactionType })).toThrow(InvalidInventoryDataError);
    expect(() => InventoryTransaction.create({ ...data, type: TransactionType.TRANSFER })).toThrow(InvalidInventoryDataError);
    expect(InventoryTransaction.create({ ...data, type: TransactionType.ADJUSTMENT, quantity: 0 }).quantity).toBe(0);
    const transaction = InventoryTransaction.create(data);
    expect(transaction.domainEvents.map((event) => event.eventType)).toEqual(['inventory_transaction.recorded']);
    const createdAt = transaction.createdAt.getTime();
    transaction.createdAt.setTime(0);
    expect(transaction.createdAt.getTime()).toBe(createdAt);
  });

  it('permits only the declared purchase-order transitions', () => {
    expect(isValidStatusTransition(PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.SUBMITTED)).toBe(true);
    expect(isValidStatusTransition(PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.RECEIVED)).toBe(true);
    expect(isValidStatusTransition(PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.RECEIVED)).toBe(false);
    expect(isValidStatusTransition(PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED)).toBe(false);
  });

  it('validates purchase-order dates and item ownership', () => {
    const data = { workspaceId, supplierId: '123e4567-e89b-42d3-a456-426614174001', orderDate: new Date('2026-01-02'), createdBy: actorId };
    expect(() => PurchaseOrder.create({ ...data, expectedDate: new Date('2026-01-01') })).toThrow(InvalidInventoryDataError);
    expect(() => PurchaseOrder.create({ ...data, currency: 'INVALID' })).toThrow(InvalidInventoryDataError);
    const po = PurchaseOrder.create(data);
    const ownItem = po.addItem({ variantId: 'own', variantName: 'Own', quantity: 1, unitPrice: 1 });
    const item = PurchaseOrderItem.create({ purchaseOrderId: '123e4567-e89b-42d3-a456-426614174005', variantId: 'variant', variantName: 'Widget', quantity: 1, unitPrice: 1 });
    po.submit([ownItem]);
    po.approve();
    expect(() => po.receiveItem(item, 1)).toThrow(InvalidInventoryDataError);
  });

  it('keeps order lifecycle dependent on its items', () => {
    const po = PurchaseOrder.create({ workspaceId, supplierId: '123e4567-e89b-42d3-a456-426614174001', orderDate: new Date(), createdBy: actorId });
    expect(() => po.submit([])).toThrow(InvalidInventoryDataError);
    const item = po.addItem({ variantId: 'widget', variantName: 'Widget', quantity: 2, unitPrice: 1 });
    po.submit([item]);
    po.approve();
    const partial = po.receiveItem(item, 1);
    expect(item.receivedQuantity).toBe(0);
    expect(() => po.receive([partial])).toThrow(InvalidInventoryDataError);
    const completed = po.receiveItem(partial, 2);
    po.receive([completed]);
    expect(po.isReceived()).toBe(true);
  });

  it('reports available quantity in low-stock events', () => {
    const stock = Stock.create({ workspaceId, locationId, variantId: 'widget', quantity: 14, reorderLevel: 10 });
    stock.reserve(3);
    stock.clearDomainEvents();
    stock.removeQuantity(2);
    const alert = stock.domainEvents.find((event) => event.eventType === 'stock.low_stock_alert');
    expect(alert?.getPayload()).toMatchObject({ currentQuantity: 9, reorderLevel: 10 });
  });

  it('rejects malformed persistence UUIDs at creation and emits one deletion event', () => {
    expect(() => Supplier.create({ workspaceId: 'bad', name: 'Acme' })).toThrow(InvalidInventoryDataError);
    expect(() => Location.create({ workspaceId: 'bad', name: 'Main' })).toThrow(InvalidInventoryDataError);
    expect(() => Stock.create({ workspaceId, locationId: 'bad', variantId: 'widget' })).toThrow(InvalidInventoryDataError);
    expect(() => InventoryTransaction.create({ workspaceId, locationId, variantId: 'widget', type: TransactionType.IN, quantity: 1, createdBy: actorId, referenceId: 'bad' })).toThrow(InvalidInventoryDataError);
    expect(() => PurchaseOrderItem.create({ purchaseOrderId: 'bad', variantId: 'widget', variantName: 'Widget', quantity: 1, unitPrice: 1 })).toThrow(InvalidInventoryDataError);
    expect(() => PurchaseOrder.create({ workspaceId, supplierId: 'bad', orderDate: new Date(), createdBy: actorId })).toThrow(InvalidInventoryDataError);
    const supplier = Supplier.create({ workspaceId, name: 'Acme' });
    supplier.clearDomainEvents();
    supplier.markAsDeleted();
    supplier.markAsDeleted();
    expect(supplier.domainEvents.filter((event) => event.eventType === 'supplier.deleted')).toHaveLength(1);
    const location = Location.create({ workspaceId, name: 'Main' });
    location.clearDomainEvents();
    location.markAsDeleted();
    location.markAsDeleted();
    expect(location.domainEvents.filter((event) => event.eventType === 'location.deleted')).toHaveLength(1);
    const po = PurchaseOrder.create({ workspaceId, supplierId: '123e4567-e89b-42d3-a456-426614174001', orderDate: new Date(), createdBy: actorId });
    po.clearDomainEvents();
    po.markAsDeleted();
    po.markAsDeleted();
    expect(po.domainEvents.filter((event) => event.eventType === 'purchase_order.deleted')).toHaveLength(1);
  });
});
