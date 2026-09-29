import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('inventory-management database invariants', () => {
  const prisma = new PrismaClient();
  const workspaceId = randomUUID();
  const foreignWorkspaceId = randomUUID();
  const supplierId = randomUUID();
  const locationId = randomUUID();
  const purchaseOrderId = randomUUID();

  beforeAll(async () => {
    await prisma.supplier.create({ data: {
      id: supplierId, workspaceId, name: `Supplier ${supplierId}`,
    } });
    await prisma.location.create({ data: {
      id: locationId, workspaceId, name: `Location ${locationId}`,
    } });
    await prisma.purchaseOrder.create({ data: {
      id: purchaseOrderId, workspaceId, supplierId,
      orderDate: new Date('2026-01-01T00:00:00.000Z'), createdBy: randomUUID(),
    } });
  });

  afterAll(async () => {
    await prisma.inventoryTransaction.deleteMany({ where: { workspaceId } });
    await prisma.stock.deleteMany({ where: { workspaceId } });
    await prisma.purchaseOrder.deleteMany({ where: { id: purchaseOrderId } });
    await prisma.location.deleteMany({ where: { id: locationId } });
    await prisma.supplier.deleteMany({ where: { id: supplierId } });
    await prisma.$disconnect();
  });

  it('rejects cross-workspace supplier and location references', async () => {
    await expect(prisma.purchaseOrder.create({ data: {
      workspaceId: foreignWorkspaceId, supplierId,
      orderDate: new Date('2026-01-01T00:00:00.000Z'), createdBy: randomUUID(),
    } })).rejects.toThrow();
    await expect(prisma.stock.create({ data: {
      workspaceId: foreignWorkspaceId, locationId, variantId: 'widget',
    } })).rejects.toThrow();
    await expect(prisma.inventoryTransaction.create({ data: {
      workspaceId: foreignWorkspaceId, locationId, variantId: 'widget',
      type: 'IN', quantity: 1, createdBy: randomUUID(),
    } })).rejects.toThrow();
  });

  it('rejects invalid inventory quantities and order dates on direct writes', async () => {
    await expect(prisma.stock.create({ data: {
      workspaceId, locationId, variantId: `negative-${randomUUID()}`, quantity: -1,
    } })).rejects.toThrow();
    await expect(prisma.stock.create({ data: {
      workspaceId, locationId, variantId: `reserved-${randomUUID()}`,
      quantity: 1, reservedQuantity: 2,
    } })).rejects.toThrow();
    await expect(prisma.purchaseOrderItem.create({ data: {
      purchaseOrderId, variantId: 'widget', variantName: 'Widget',
      quantity: 2, receivedQuantity: 3, unitPrice: 1,
    } })).rejects.toThrow();
    await expect(prisma.inventoryTransaction.create({ data: {
      workspaceId, locationId, variantId: 'widget',
      type: 'OUT', quantity: 0, createdBy: randomUUID(),
    } })).rejects.toThrow();
    await expect(prisma.purchaseOrder.create({ data: {
      workspaceId, supplierId,
      orderDate: new Date('2026-01-02T00:00:00.000Z'),
      expectedDate: new Date('2026-01-01T00:00:00.000Z'), createdBy: randomUUID(),
    } })).rejects.toThrow();
  });

  it('keeps referenced suppliers and locations while dependent records exist', async () => {
    await prisma.stock.create({ data: {
      workspaceId, locationId, variantId: 'widget', quantity: 1,
    } });
    await expect(prisma.supplier.delete({ where: { id: supplierId } })).rejects.toThrow();
    await expect(prisma.location.delete({ where: { id: locationId } })).rejects.toThrow();
  });

  it('deletes order items with their parent order', async () => {
    const temporaryOrderId = randomUUID();
    const itemId = randomUUID();
    await prisma.purchaseOrder.create({ data: {
      id: temporaryOrderId, workspaceId, supplierId,
      orderDate: new Date('2026-01-01T00:00:00.000Z'), createdBy: randomUUID(),
    } });
    try {
      await prisma.purchaseOrderItem.create({ data: {
        id: itemId, purchaseOrderId: temporaryOrderId,
        variantId: 'widget', variantName: 'Widget', quantity: 2, unitPrice: 1,
      } });
      await prisma.purchaseOrder.delete({ where: { id: temporaryOrderId } });
      expect(await prisma.purchaseOrderItem.count({ where: { id: itemId } })).toBe(0);
    } finally {
      await prisma.purchaseOrder.deleteMany({ where: { id: temporaryOrderId } });
    }
  });
});
