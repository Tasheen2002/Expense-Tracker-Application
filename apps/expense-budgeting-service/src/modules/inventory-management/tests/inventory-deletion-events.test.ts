import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { IEventBus } from '@core/domain/events/domain-event';
import { Supplier } from '../domain/entities/supplier.entity';
import { Location } from '../domain/entities/location.entity';
import { PurchaseOrder } from '../domain/entities/purchase-order.entity';
import { SupplierRepositoryImpl } from '../infrastructure/persistence/supplier.repository.impl';
import { LocationRepositoryImpl } from '../infrastructure/persistence/location.repository.impl';
import { PurchaseOrderRepositoryImpl } from '../infrastructure/persistence/purchase-order.repository.impl';

describe('inventory deletion events', () => {
  it('deletes the row and writes its event through one transaction client', async () => {
    const tx = {
      supplier: { delete: vi.fn().mockResolvedValue({}) },
      location: { delete: vi.fn().mockResolvedValue({}) },
      purchaseOrder: { delete: vi.fn().mockResolvedValue({}) },
      outboxEvent: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn().mockResolvedValue(undefined) } as unknown as IEventBus;
    const workspaceId = randomUUID();
    const supplier = Supplier.create({ workspaceId, name: 'Acme' });
    supplier.clearDomainEvents();
    supplier.markAsDeleted();
    await new SupplierRepositoryImpl(prisma, eventBus).delete(supplier);

    const location = Location.create({ workspaceId, name: 'Main' });
    location.clearDomainEvents();
    location.markAsDeleted();
    await new LocationRepositoryImpl(prisma, eventBus).delete(location);

    const po = PurchaseOrder.create({ workspaceId, supplierId: supplier.id.getValue(), orderDate: new Date(), createdBy: randomUUID() });
    po.clearDomainEvents();
    po.markAsDeleted();
    await new PurchaseOrderRepositoryImpl(prisma, eventBus).delete(po);

    expect(tx.supplier.delete).toHaveBeenCalledOnce();
    expect(tx.location.delete).toHaveBeenCalledOnce();
    expect(tx.purchaseOrder.delete).toHaveBeenCalledOnce();
    expect(tx.outboxEvent.createMany).toHaveBeenCalledTimes(3);
    expect(tx.outboxEvent.createMany.mock.calls.map(([input]) => input.data[0].eventType)).toEqual([
      'supplier.deleted', 'location.deleted', 'purchase_order.deleted',
    ]);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(3);
  });
});
