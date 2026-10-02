import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { PurchaseOrderService } from '../application/services/purchase-order.service';
import { PurchaseOrder } from '../domain/entities/purchase-order.entity';
import { Supplier } from '../domain/entities/supplier.entity';
import { PurchaseOrderStatus } from '../domain/enums/purchase-order-status';
import {
  PurchaseOrderCannotBeDeletedError,
  PurchaseOrderItemNotFoundError,
  SupplierInactiveError,
} from '../domain/errors/inventory.errors';
import type { IPurchaseOrderRepository } from '../domain/repositories/purchase-order.repository';
import type { ISupplierRepository } from '../domain/repositories/supplier.repository';
import type { StockService } from '../application/services/stock.service';
import type { IUnitOfWork } from '@shared/application/ports/unit-of-work.port';

describe('PurchaseOrderService', () => {
  it('creates only for an active supplier inside the inventory write boundary', async () => {
    const workspaceId = randomUUID();
    const supplier = Supplier.create({ workspaceId, name: 'Acme' });
    const order: string[] = [];
    const supplierRepository = {
      findById: vi.fn(async () => { order.push('supplier'); return supplier; }),
    } as unknown as ISupplierRepository;
    const poRepository = {
      save: vi.fn(async () => { order.push('save'); }),
    } as unknown as IPurchaseOrderRepository;
    const unitOfWork: IUnitOfWork = { async execute<T>(work: () => Promise<T>): Promise<T> {
      order.push('transaction'); return work();
    } };
    const writeLock = { acquire: vi.fn(async () => { order.push('lock'); }) };
    const service = new PurchaseOrderService(
      poRepository, supplierRepository, {} as StockService, unitOfWork, writeLock
    );

    const result = await service.createPurchaseOrder({
      workspaceId, supplierId: supplier.id.getValue(), orderDate: new Date(), createdBy: randomUUID(),
    });

    expect(result.status).toBe(PurchaseOrderStatus.DRAFT);
    expect(order).toEqual(['transaction', 'lock', 'supplier', 'save']);
  });

  it('rejects an inactive supplier before creating an order', async () => {
    const workspaceId = randomUUID();
    const supplier = Supplier.create({ workspaceId, name: 'Acme' });
    supplier.deactivate();
    const supplierRepository = { findById: vi.fn().mockResolvedValue(supplier) } as unknown as ISupplierRepository;
    const poRepository = { save: vi.fn() } as unknown as IPurchaseOrderRepository;
    const service = new PurchaseOrderService(
      poRepository, supplierRepository, {} as StockService,
      { execute: async (work) => work() }, { acquire: vi.fn().mockResolvedValue(undefined) }
    );

    await expect(service.createPurchaseOrder({
      workspaceId, supplierId: supplier.id.getValue(), orderDate: new Date(), createdBy: randomUUID(),
    })).rejects.toThrow(SupplierInactiveError);
    expect(poRepository.save).not.toHaveBeenCalled();
  });

  it('persists the item-added event with the recalculated order total', async () => {
    const workspaceId = randomUUID();
    const po = PurchaseOrder.create({
      workspaceId, supplierId: randomUUID(), orderDate: new Date(), createdBy: randomUUID(),
    });
    po.clearDomainEvents();
    let savedItem: Parameters<IPurchaseOrderRepository['saveItem']>[0] | undefined;
    const poRepository = {
      findById: vi.fn().mockResolvedValue(po),
      saveItem: vi.fn(async (item) => { savedItem = item; }),
      findItemsByPurchaseOrder: vi.fn(async () => savedItem ? [savedItem] : []),
      save: vi.fn(),
    } as unknown as IPurchaseOrderRepository;
    const service = new PurchaseOrderService(
      poRepository, {} as ISupplierRepository, {} as StockService,
      { execute: async (work) => work() }, { acquire: vi.fn().mockResolvedValue(undefined) }
    );

    await service.addItem({
      purchaseOrderId: po.id.getValue(), workspaceId, variantId: 'widget',
      variantName: 'Widget', quantity: 2, unitPrice: 4.5,
    });

    expect(po.totalAmount).toBe(9);
    expect(poRepository.save).toHaveBeenCalledWith(po);
    expect(po.domainEvents.map((event) => event.eventType)).toContain('purchase_order.item_added');
  });

  it('does not delete a submitted order', async () => {
    const workspaceId = randomUUID();
    const po = PurchaseOrder.create({
      workspaceId, supplierId: randomUUID(), orderDate: new Date(), createdBy: randomUUID(),
    });
    const item = po.addItem({ variantId: 'widget', variantName: 'Widget', quantity: 1, unitPrice: 1 });
    po.submit([item]);
    const poRepository = {
      findById: vi.fn().mockResolvedValue(po), delete: vi.fn(),
    } as unknown as IPurchaseOrderRepository;
    const service = new PurchaseOrderService(
      poRepository, {} as ISupplierRepository, {} as StockService,
      { execute: async (work) => work() }, { acquire: vi.fn().mockResolvedValue(undefined) }
    );

    await expect(service.deletePurchaseOrder(po.id.getValue(), workspaceId))
      .rejects.toThrow(PurchaseOrderCannotBeDeletedError);
    expect(poRepository.delete).not.toHaveBeenCalled();
  });

  it('persists an item-removed event with the recalculated total', async () => {
    const workspaceId = randomUUID();
    const po = PurchaseOrder.create({
      workspaceId, supplierId: randomUUID(), orderDate: new Date(), createdBy: randomUUID(),
    });
    const item = po.addItem({ variantId: 'widget', variantName: 'Widget', quantity: 2, unitPrice: 4.5 });
    po.updateTotalAmount(9);
    po.clearDomainEvents();
    const poRepository = {
      findItemById: vi.fn().mockResolvedValue(item),
      findById: vi.fn().mockResolvedValue(po),
      deleteItem: vi.fn(),
      findItemsByPurchaseOrder: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
    } as unknown as IPurchaseOrderRepository;
    const service = new PurchaseOrderService(
      poRepository, {} as ISupplierRepository, {} as StockService,
      { execute: async (work) => work() }, { acquire: vi.fn().mockResolvedValue(undefined) }
    );

    await service.removeItem(item.id.getValue(), po.id.getValue(), workspaceId);

    expect(po.totalAmount).toBe(0);
    expect(poRepository.save).toHaveBeenCalledWith(po);
    expect(po.domainEvents.map((event) => event.eventType)).toContain('purchase_order.item_removed');
  });

  it('rejects an item belonging to a different order in the same workspace', async () => {
    const workspaceId = randomUUID();
    const po = PurchaseOrder.create({
      workspaceId, supplierId: randomUUID(), orderDate: new Date(), createdBy: randomUUID(),
    });
    const item = po.addItem({ variantId: 'widget', variantName: 'Widget', quantity: 1, unitPrice: 1 });
    const poRepository = {
      findItemById: vi.fn().mockResolvedValue(item),
      findById: vi.fn(),
      deleteItem: vi.fn(),
    } as unknown as IPurchaseOrderRepository;
    const service = new PurchaseOrderService(
      poRepository, {} as ISupplierRepository, {} as StockService,
      { execute: async (work) => work() }, { acquire: vi.fn().mockResolvedValue(undefined) }
    );

    await expect(service.removeItem(item.id.getValue(), randomUUID(), workspaceId))
      .rejects.toThrow(PurchaseOrderItemNotFoundError);
    expect(poRepository.findById).not.toHaveBeenCalled();
    expect(poRepository.deleteItem).not.toHaveBeenCalled();
  });
});
