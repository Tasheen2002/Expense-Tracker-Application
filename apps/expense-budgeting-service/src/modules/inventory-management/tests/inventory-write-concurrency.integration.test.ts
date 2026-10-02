import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import type { IEventBus } from '@core/domain/events/domain-event';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';
import { StockService } from '../application/services/stock.service';
import { PurchaseOrderService } from '../application/services/purchase-order.service';
import { TransactionType } from '../domain/enums/transaction-type';
import { LocationRepositoryImpl } from '../infrastructure/persistence/location.repository.impl';
import { StockRepositoryImpl } from '../infrastructure/persistence/stock.repository.impl';
import { InventoryTransactionRepositoryImpl } from '../infrastructure/persistence/inventory-transaction.repository.impl';
import { PurchaseOrderRepositoryImpl } from '../infrastructure/persistence/purchase-order.repository.impl';
import { SupplierRepositoryImpl } from '../infrastructure/persistence/supplier.repository.impl';
import { PrismaInventoryWriteLock } from '../infrastructure/persistence/prisma-inventory-write-lock';

describe('inventory writes against PostgreSQL', () => {
  const prisma = new PrismaClient();
  const eventBus = { publishAll: vi.fn().mockResolvedValue(undefined) } as unknown as IEventBus;
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const lock = new PrismaInventoryWriteLock(prisma);
  const stockRepository = new StockRepositoryImpl(prisma, eventBus);
  const transactionRepository = new InventoryTransactionRepositoryImpl(prisma, eventBus);
  const locationRepository = new LocationRepositoryImpl(prisma, eventBus);
  const purchaseOrderRepository = new PurchaseOrderRepositoryImpl(prisma, eventBus);
  const supplierRepository = new SupplierRepositoryImpl(prisma, eventBus);
  const workspaceId = randomUUID();
  const locationId = randomUUID();
  const supplierId = randomUUID();
  const purchaseOrderId = randomUUID();

  const stockService = new StockService(
    stockRepository, transactionRepository, locationRepository, unitOfWork, lock
  );

  afterAll(async () => {
    const stockIds = (await prisma.stock.findMany({ where: { workspaceId }, select: { id: true } })).map((row) => row.id);
    const transactionIds = (await prisma.inventoryTransaction.findMany({ where: { workspaceId }, select: { id: true } })).map((row) => row.id);
    await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: [...stockIds, ...transactionIds, purchaseOrderId] } } });
    await prisma.inventoryTransaction.deleteMany({ where: { workspaceId } });
    await prisma.stock.deleteMany({ where: { workspaceId } });
    await prisma.purchaseOrder.deleteMany({ where: { id: purchaseOrderId } });
    await prisma.location.deleteMany({ where: { id: locationId } });
    await prisma.supplier.deleteMany({ where: { id: supplierId } });
    await prisma.$disconnect();
  });

  it('keeps both concurrent adjustments without losing a stock update', async () => {
    await prisma.location.create({ data: { id: locationId, workspaceId, name: `Location ${locationId}` } });
    const actorId = randomUUID();
    const adjust = () => stockService.adjustStock({
      workspaceId, locationId, variantId: 'concurrent-widget',
      quantity: 1, type: TransactionType.IN, createdBy: actorId,
    });

    await Promise.all([adjust(), adjust()]);

    const stock = await prisma.stock.findFirst({ where: { workspaceId, locationId, variantId: 'concurrent-widget' } });
    expect(stock?.quantity).toBe(2);
    expect(await prisma.inventoryTransaction.count({ where: {
      workspaceId, locationId, variantId: 'concurrent-widget',
    } })).toBe(2);
  });

  it('rolls back the first received item when the second ledger write fails', async () => {
    await prisma.supplier.create({ data: { id: supplierId, workspaceId, name: `Supplier ${supplierId}` } });
    await prisma.purchaseOrder.create({ data: {
      id: purchaseOrderId, workspaceId, supplierId, status: 'APPROVED', totalAmount: 2,
      orderDate: new Date('2026-01-01T00:00:00.000Z'), createdBy: randomUUID(),
      items: { create: [
        { variantId: 'receipt-one', variantName: 'One', quantity: 1, unitPrice: 1 },
        { variantId: 'receipt-two', variantName: 'Two', quantity: 1, unitPrice: 1 },
      ] },
    } });
    const originalSave = transactionRepository.save.bind(transactionRepository);
    let saves = 0;
    const saveSpy = vi.spyOn(transactionRepository, 'save').mockImplementation(async (transaction) => {
      saves += 1;
      if (saves === 2) throw new Error('second ledger write failed');
      await originalSave(transaction);
    });
    const service = new PurchaseOrderService(
      purchaseOrderRepository, supplierRepository, stockService, unitOfWork, lock
    );
    const outboxBefore = await prisma.outboxEvent.count();

    try {
      await expect(service.receivePurchaseOrder(
        purchaseOrderId, workspaceId, locationId, randomUUID()
      )).rejects.toThrow('second ledger write failed');
    } finally {
      saveSpy.mockRestore();
    }

    expect(saves).toBe(2);
    expect((await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } }))?.status).toBe('APPROVED');
    expect((await prisma.purchaseOrderItem.findMany({ where: { purchaseOrderId } })).every((item) => item.receivedQuantity === 0)).toBe(true);
    expect(await prisma.stock.count({ where: { workspaceId, variantId: { in: ['receipt-one', 'receipt-two'] } } })).toBe(0);
    expect(await prisma.inventoryTransaction.count({ where: { workspaceId, referenceId: purchaseOrderId } })).toBe(0);
    expect(await prisma.outboxEvent.count()).toBe(outboxBefore);
  });
});
