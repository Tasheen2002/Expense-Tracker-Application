import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { IEventBus } from '@core/domain/events/domain-event';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';
import { PrismaInventoryWriteLock } from '../infrastructure/persistence/prisma-inventory-write-lock';
import { StockRepositoryImpl } from '../infrastructure/persistence/stock.repository.impl';
import { InventoryTransactionRepositoryImpl } from '../infrastructure/persistence/inventory-transaction.repository.impl';
import { LocationRepositoryImpl } from '../infrastructure/persistence/location.repository.impl';
import { StockService } from '../application/services/stock.service';
import { PurchaseOrderService } from '../application/services/purchase-order.service';
import { PurchaseOrder } from '../domain/entities/purchase-order.entity';
import { TransactionType } from '../domain/enums/transaction-type';
import { LocationInactiveError, LocationNotFoundError, StockNotFoundError } from '../domain/errors/inventory.errors';
import type { IPurchaseOrderRepository } from '../domain/repositories/purchase-order.repository';
import type { ISupplierRepository } from '../domain/repositories/supplier.repository';

describe('atomic inventory write workflows', () => {
  const activeLocation = ({ where }: { where: { id: string; workspaceId: string } }) => Promise.resolve({
    id: where.id,
    workspaceId: where.workspaceId,
    name: 'Main',
    type: 'WAREHOUSE',
    address: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('uses one transaction client for stock, ledger row, lock, and outbox', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ locked: '' }]),
      location: { findFirst: vi.fn().mockImplementation(activeLocation) },
      stock: { findFirst: vi.fn().mockResolvedValue(null), upsert: vi.fn().mockResolvedValue({}) },
      inventoryTransaction: { create: vi.fn().mockResolvedValue({}) },
      outboxEvent: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
      inventoryTransaction: { create: vi.fn() },
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn().mockResolvedValue(undefined) } as unknown as IEventBus;
    const service = new StockService(
      new StockRepositoryImpl(prisma, eventBus),
      new InventoryTransactionRepositoryImpl(prisma, eventBus),
      new LocationRepositoryImpl(prisma, eventBus),
      new PrismaUnitOfWork(prisma),
      new PrismaInventoryWriteLock(prisma)
    );
    const result = await service.adjustStock({
      workspaceId: randomUUID(), variantId: 'widget', locationId: randomUUID(),
      quantity: 3, type: TransactionType.IN, createdBy: randomUUID(),
    });
    expect(result.stock.quantity).toBe(3);
    expect(tx.$queryRaw).toHaveBeenCalledOnce();
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.stock.findFirst.mock.invocationCallOrder[0]);
    expect(tx.stock.upsert).toHaveBeenCalledOnce();
    expect(tx.inventoryTransaction.create).toHaveBeenCalledOnce();
    expect(tx.outboxEvent.createMany).toHaveBeenCalled();
    expect(prisma.inventoryTransaction.create).not.toHaveBeenCalled();
    expect(eventBus.publishAll).toHaveBeenCalledTimes(2);
  });

  it('does not publish stock events when the ledger insert fails', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ locked: '' }]),
      location: { findFirst: vi.fn().mockImplementation(activeLocation) },
      stock: { findFirst: vi.fn().mockResolvedValue(null), upsert: vi.fn().mockResolvedValue({}) },
      inventoryTransaction: { create: vi.fn().mockRejectedValue(new Error('ledger insert failed')) },
      outboxEvent: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = { $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)) } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn().mockResolvedValue(undefined) } as unknown as IEventBus;
    const service = new StockService(
      new StockRepositoryImpl(prisma, eventBus), new InventoryTransactionRepositoryImpl(prisma, eventBus),
      new LocationRepositoryImpl(prisma, eventBus), new PrismaUnitOfWork(prisma),
      new PrismaInventoryWriteLock(prisma)
    );
    await expect(service.adjustStock({
      workspaceId: randomUUID(), variantId: 'widget', locationId: randomUUID(),
      quantity: 3, type: TransactionType.IN, createdBy: randomUUID(),
    })).rejects.toThrow('ledger insert failed');
    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });

  it('rejects a location from another workspace before changing stock', async () => {
    const workspaceId = randomUUID();
    const locationId = randomUUID();
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ locked: '' }]),
      location: { findFirst: vi.fn().mockResolvedValue(null) },
      stock: { findFirst: vi.fn(), upsert: vi.fn() },
      inventoryTransaction: { create: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn() } as unknown as IEventBus;
    const service = new StockService(
      new StockRepositoryImpl(prisma, eventBus),
      new InventoryTransactionRepositoryImpl(prisma, eventBus),
      new LocationRepositoryImpl(prisma, eventBus),
      new PrismaUnitOfWork(prisma), new PrismaInventoryWriteLock(prisma)
    );

    await expect(service.adjustStock({
      workspaceId, variantId: 'widget', locationId,
      quantity: 3, type: TransactionType.IN, createdBy: randomUUID(),
    })).rejects.toThrow(LocationNotFoundError);
    expect(tx.location.findFirst).toHaveBeenCalledWith({ where: { id: locationId, workspaceId } });
    expect(tx.stock.findFirst).not.toHaveBeenCalled();
    expect(tx.stock.upsert).not.toHaveBeenCalled();
    expect(tx.inventoryTransaction.create).not.toHaveBeenCalled();
  });

  it('does not publish stock or ledger events when an outbox write fails', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ locked: '' }]),
      location: { findFirst: vi.fn().mockImplementation(activeLocation) },
      stock: { findFirst: vi.fn().mockResolvedValue(null), upsert: vi.fn().mockResolvedValue({}) },
      inventoryTransaction: { create: vi.fn() },
      outboxEvent: { createMany: vi.fn().mockRejectedValue(new Error('outbox write failed')) },
    };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn() } as unknown as IEventBus;
    const service = new StockService(
      new StockRepositoryImpl(prisma, eventBus),
      new InventoryTransactionRepositoryImpl(prisma, eventBus),
      new LocationRepositoryImpl(prisma, eventBus),
      new PrismaUnitOfWork(prisma), new PrismaInventoryWriteLock(prisma)
    );

    await expect(service.adjustStock({
      workspaceId: randomUUID(), variantId: 'widget', locationId: randomUUID(),
      quantity: 3, type: TransactionType.IN, createdBy: randomUUID(),
    })).rejects.toThrow('outbox write failed');
    expect(tx.stock.upsert).toHaveBeenCalledOnce();
    expect(tx.inventoryTransaction.create).not.toHaveBeenCalled();
    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });

  it('serializes concurrent adjustments before each stock read', async () => {
    const workspaceId = randomUUID();
    const locationId = randomUUID();
    const actorId = randomUUID();
    let stockRow: Record<string, unknown> | null = null;
    let locked = false;
    const waiters: Array<() => void> = [];
    const tx = {
      $queryRaw: vi.fn(async () => {
        if (locked) await new Promise<void>((resolve) => waiters.push(resolve));
        locked = true;
        return [{ locked: '' }];
      }),
      location: { findFirst: vi.fn().mockImplementation(activeLocation) },
      stock: {
        findFirst: vi.fn(async () => stockRow ? { ...stockRow } : null),
        upsert: vi.fn(async ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
          stockRow = stockRow ? { ...stockRow, ...update } : { ...create };
          return stockRow;
        }),
      },
      inventoryTransaction: { create: vi.fn().mockResolvedValue({}) },
      outboxEvent: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => {
        try {
          return await work(tx);
        } finally {
          locked = false;
          waiters.shift()?.();
        }
      }),
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn().mockResolvedValue(undefined) } as unknown as IEventBus;
    const service = new StockService(
      new StockRepositoryImpl(prisma, eventBus),
      new InventoryTransactionRepositoryImpl(prisma, eventBus),
      new LocationRepositoryImpl(prisma, eventBus),
      new PrismaUnitOfWork(prisma), new PrismaInventoryWriteLock(prisma)
    );

    const adjust = () => service.adjustStock({
      workspaceId, variantId: 'widget', locationId,
      quantity: 1, type: TransactionType.IN, createdBy: actorId,
    });
    const results = await Promise.all([adjust(), adjust()]);

    expect(results.map((result) => result.stock.quantity)).toEqual([1, 2]);
    expect(stockRow).toMatchObject({ workspaceId, locationId, variantId: 'widget', quantity: 2 });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.inventoryTransaction.create).toHaveBeenCalledTimes(2);
    expect(tx.outboxEvent.createMany).toHaveBeenCalledTimes(4);
  });

  it('rejects an inactive location before reading or changing stock', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ locked: '' }]),
      location: { findFirst: vi.fn().mockImplementation(async (query) => ({
        ...await activeLocation(query), isActive: false,
      })) },
      stock: { findFirst: vi.fn(), upsert: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn() } as unknown as IEventBus;
    const service = new StockService(
      new StockRepositoryImpl(prisma, eventBus),
      new InventoryTransactionRepositoryImpl(prisma, eventBus),
      new LocationRepositoryImpl(prisma, eventBus),
      new PrismaUnitOfWork(prisma),
      new PrismaInventoryWriteLock(prisma)
    );

    await expect(service.adjustStock({
      workspaceId: randomUUID(), variantId: 'widget', locationId: randomUUID(),
      quantity: 3, type: TransactionType.IN, createdBy: randomUUID(),
    })).rejects.toThrow(LocationInactiveError);
    expect(tx.stock.findFirst).not.toHaveBeenCalled();
    expect(tx.stock.upsert).not.toHaveBeenCalled();
  });

  it('reports the stock ID and workspace when settings target is missing', async () => {
    const workspaceId = randomUUID();
    const stockId = randomUUID();
    const tx = { $queryRaw: vi.fn().mockResolvedValue([{ locked: '' }]), stock: { findFirst: vi.fn().mockResolvedValue(null) } };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn() } as unknown as IEventBus;
    const service = new StockService(
      new StockRepositoryImpl(prisma, eventBus),
      new InventoryTransactionRepositoryImpl(prisma, eventBus),
      new LocationRepositoryImpl(prisma, eventBus),
      new PrismaUnitOfWork(prisma),
      new PrismaInventoryWriteLock(prisma)
    );

    await expect(service.updateStockSettings(stockId, workspaceId, { reorderLevel: 2 }))
      .rejects.toThrow(new StockNotFoundError(stockId, workspaceId).message);
  });

  it('receives all outstanding order items before marking the order received', async () => {
    const workspaceId = randomUUID();
    const po = PurchaseOrder.create({ workspaceId, supplierId: randomUUID(), orderDate: new Date(), createdBy: randomUUID() });
    const item = po.addItem({ variantId: 'widget', variantName: 'Widget', quantity: 4, unitPrice: 2 });
    po.submit([item]);
    po.approve();
    const partialItem = po.receiveItem(item, 1);
    po.clearDomainEvents();
    const poRepository = {
      findById: vi.fn().mockResolvedValue(po),
      findItemsByPurchaseOrder: vi.fn().mockResolvedValue([partialItem]),
      saveItem: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as IPurchaseOrderRepository;
    const stockService = { adjustStock: vi.fn().mockResolvedValue({}) } as unknown as StockService;
    const service = new PurchaseOrderService(
      poRepository, {} as ISupplierRepository, stockService,
      { execute: async (work) => work() }, { acquire: vi.fn().mockResolvedValue(undefined) }
    );
    const locationId = randomUUID();
    const actorId = randomUUID();
    const result = await service.receivePurchaseOrder(po.id.getValue(), workspaceId, locationId, actorId);
    expect(stockService.adjustStock).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId, locationId, quantity: 3, type: TransactionType.IN,
      referenceId: po.id.getValue(), referenceType: 'PURCHASE_ORDER', createdBy: actorId,
    }));
    expect(partialItem.receivedQuantity).toBe(1);
    expect(vi.mocked(poRepository.saveItem).mock.calls[0][0].receivedQuantity).toBe(4);
    expect(result.status).toBe('RECEIVED');
    expect(poRepository.saveItem).toHaveBeenCalledOnce();
    expect(poRepository.save).toHaveBeenCalledOnce();
  });

  it('receives an order and stocks its item within one ambient transaction', async () => {
    const workspaceId = randomUUID();
    const locationId = randomUUID();
    const po = PurchaseOrder.create({ workspaceId, supplierId: randomUUID(), orderDate: new Date(), createdBy: randomUUID() });
    const item = po.addItem({ variantId: 'widget', variantName: 'Widget', quantity: 2, unitPrice: 1 });
    po.submit([item]);
    po.approve();
    po.clearDomainEvents();
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ locked: '' }]),
      location: { findFirst: vi.fn().mockImplementation(activeLocation) },
      stock: { findFirst: vi.fn().mockResolvedValue(null), upsert: vi.fn().mockResolvedValue({}) },
      inventoryTransaction: { create: vi.fn().mockResolvedValue({}) },
      outboxEvent: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn().mockResolvedValue(undefined) } as unknown as IEventBus;
    const unitOfWork = new PrismaUnitOfWork(prisma);
    const writeLock = new PrismaInventoryWriteLock(prisma);
    const stockService = new StockService(
      new StockRepositoryImpl(prisma, eventBus),
      new InventoryTransactionRepositoryImpl(prisma, eventBus),
      new LocationRepositoryImpl(prisma, eventBus), unitOfWork, writeLock
    );
    const poRepository = {
      findById: vi.fn().mockResolvedValue(po),
      findItemsByPurchaseOrder: vi.fn().mockResolvedValue([item]),
      saveItem: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as IPurchaseOrderRepository;
    const service = new PurchaseOrderService(
      poRepository, {} as ISupplierRepository, stockService, unitOfWork, writeLock
    );

    const result = await service.receivePurchaseOrder(po.id.getValue(), workspaceId, locationId, randomUUID());
    expect(result.status).toBe('RECEIVED');
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.stock.upsert).toHaveBeenCalledOnce();
    expect(tx.inventoryTransaction.create).toHaveBeenCalledOnce();
    expect(tx.outboxEvent.createMany).toHaveBeenCalled();
    expect(poRepository.save).toHaveBeenCalledOnce();
  });

  it('does not finalize a purchase order when stocking fails', async () => {
    const workspaceId = randomUUID();
    const po = PurchaseOrder.create({ workspaceId, supplierId: randomUUID(), orderDate: new Date(), createdBy: randomUUID() });
    const item = po.addItem({ variantId: 'widget', variantName: 'Widget', quantity: 2, unitPrice: 1 });
    po.submit([item]);
    po.approve();
    const poRepository = {
      findById: vi.fn().mockResolvedValue(po),
      findItemsByPurchaseOrder: vi.fn().mockResolvedValue([item]),
      saveItem: vi.fn(),
      save: vi.fn(),
    } as unknown as IPurchaseOrderRepository;
    const stockService = { adjustStock: vi.fn().mockRejectedValue(new Error('stock write failed')) } as unknown as StockService;
    const service = new PurchaseOrderService(
      poRepository, {} as ISupplierRepository, stockService,
      { execute: async (work) => work() }, { acquire: vi.fn().mockResolvedValue(undefined) }
    );
    await expect(service.receivePurchaseOrder(po.id.getValue(), workspaceId, randomUUID(), randomUUID())).rejects.toThrow('stock write failed');
    expect(po.status).toBe('APPROVED');
    expect(poRepository.save).not.toHaveBeenCalled();
    expect(poRepository.saveItem).not.toHaveBeenCalled();
  });
});
