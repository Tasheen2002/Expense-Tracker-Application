import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { IEventBus } from '@core/domain/events/domain-event';
import { describe, expect, it, vi } from 'vitest';
import { PurchaseOrder } from '../domain/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../domain/entities/purchase-order-item.entity';
import { SupplierNotFoundError } from '../domain/errors/inventory.errors';
import { PurchaseOrderRepositoryImpl } from '../infrastructure/persistence/purchase-order.repository.impl';

describe('purchase-order persistence', () => {
  it('saves the order and outbox event in one transaction', async () => {
    const tx = {
      purchaseOrder: { upsert: vi.fn().mockResolvedValue({}) },
      outboxEvent: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
      purchaseOrder: { upsert: vi.fn() },
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn().mockResolvedValue(undefined) } as unknown as IEventBus;
    const po = PurchaseOrder.create({
      workspaceId: randomUUID(), supplierId: randomUUID(), orderDate: new Date(), createdBy: randomUUID(),
    });

    await new PurchaseOrderRepositoryImpl(prisma, eventBus).save(po);

    expect(tx.purchaseOrder.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: po.id.getValue(), workspaceId: po.workspaceId },
    }));
    expect(tx.outboxEvent.createMany).toHaveBeenCalledOnce();
    expect(prisma.purchaseOrder.upsert).not.toHaveBeenCalled();
    expect(eventBus.publishAll).toHaveBeenCalledOnce();
  });

  it('does not publish when the outbox write fails', async () => {
    const tx = {
      purchaseOrder: { upsert: vi.fn().mockResolvedValue({}) },
      outboxEvent: { createMany: vi.fn().mockRejectedValue(new Error('outbox failed')) },
    };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    } as unknown as PrismaClient;
    const eventBus = { publishAll: vi.fn() } as unknown as IEventBus;
    const po = PurchaseOrder.create({
      workspaceId: randomUUID(), supplierId: randomUUID(), orderDate: new Date(), createdBy: randomUUID(),
    });

    await expect(new PurchaseOrderRepositoryImpl(prisma, eventBus).save(po))
      .rejects.toThrow('outbox failed');
    expect(eventBus.publishAll).not.toHaveBeenCalled();
    expect(po.domainEvents).toHaveLength(1);
  });

  it('translates a supplier deletion race to a domain error', async () => {
    const foreignKeyError = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
      code: 'P2003', clientVersion: '5.9.1', meta: { field_name: 'purchase_order_supplier_id_fkey' },
    });
    const tx = { purchaseOrder: { upsert: vi.fn().mockRejectedValue(foreignKeyError) } };
    const prisma = {
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    } as unknown as PrismaClient;
    const po = PurchaseOrder.create({
      workspaceId: randomUUID(), supplierId: randomUUID(), orderDate: new Date(), createdBy: randomUUID(),
    });

    await expect(new PurchaseOrderRepositoryImpl(prisma, { publishAll: vi.fn() } as unknown as IEventBus).save(po))
      .rejects.toThrow(SupplierNotFoundError);
  });

  it('scopes item updates to their purchase order and workspace', async () => {
    const workspaceId = randomUUID();
    const purchaseOrderId = randomUUID();
    const item = PurchaseOrderItem.create({
      purchaseOrderId, variantId: 'widget', variantName: 'Widget', quantity: 2, unitPrice: 4,
    });
    const prisma = {
      purchaseOrder: { findFirst: vi.fn().mockResolvedValue({ id: purchaseOrderId }) },
      purchaseOrderItem: { upsert: vi.fn().mockResolvedValue({}) },
    } as unknown as PrismaClient;

    await new PurchaseOrderRepositoryImpl(prisma, { publishAll: vi.fn() } as unknown as IEventBus)
      .saveItem(item, workspaceId);

    expect(prisma.purchaseOrderItem.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: item.id.getValue(), purchaseOrderId,
        purchaseOrder: { workspaceId },
      },
    }));
  });
});
