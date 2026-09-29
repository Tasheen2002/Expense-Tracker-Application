import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { buildExpenseApp } from '../../../app';

describe('inventory HTTP workflow against PostgreSQL', () => {
  it('enforces access and persists purchase-order receipt, stock, ledger, and outbox together', async () => {
    const workspaceId = randomUUID();
    const foreignWorkspaceId = randomUUID();
    const adminId = randomUUID();
    const viewerId = randomUUID();
    const headers = (userId: string) => ({
      'x-user-id': userId,
      'x-user-email': `${userId}@example.com`,
    });
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      const userId = (init.headers as Record<string, string>)['x-user-id'];
      if (url.includes(`/workspaces/${foreignWorkspaceId}/`)) {
        return { ok: false, status: 404 };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: {
          userId, workspaceId, role: userId === viewerId ? 'VIEWER' : 'ADMIN',
        } }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    const app = await buildExpenseApp({ enableInternalAuth: false, logger: false });
    const base = `/api/v1/workspaces/${workspaceId}`;
    let supplierId: string | undefined;
    let locationId: string | undefined;
    let purchaseOrderId: string | undefined;

    try {
      const unauthenticated = await app.inject({ method: 'POST', url: `${base}/suppliers`, payload: { name: 'Acme' } });
      expect(unauthenticated.statusCode).toBe(401);

      const invalid = await app.inject({
        method: 'POST', url: `${base}/suppliers`, headers: headers(adminId), payload: { name: '  ' },
      });
      expect(invalid.statusCode).toBe(400);

      const supplier = await app.inject({
        method: 'POST', url: `${base}/suppliers`, headers: headers(adminId), payload: { name: 'Inventory HTTP supplier' },
      });
      expect(supplier.statusCode).toBe(201);
      supplierId = supplier.json().data.supplierId;

      const duplicate = await app.inject({
        method: 'POST', url: `${base}/suppliers`, headers: headers(adminId), payload: { name: 'Inventory HTTP supplier' },
      });
      expect(duplicate.statusCode).toBe(409);

      const location = await app.inject({
        method: 'POST', url: `${base}/locations`, headers: headers(adminId), payload: { name: 'Inventory HTTP warehouse' },
      });
      expect(location.statusCode).toBe(201);
      locationId = location.json().data.locationId;

      const foreign = await app.inject({
        method: 'GET', url: `/api/v1/workspaces/${foreignWorkspaceId}/suppliers/${supplierId}`,
        headers: headers(adminId),
      });
      expect(foreign.statusCode).toBe(403);

      const denied = await app.inject({
        method: 'POST', url: `${base}/purchase-orders`, headers: headers(viewerId),
        payload: { supplierId, orderDate: new Date().toISOString() },
      });
      expect(denied.statusCode).toBe(403);

      const order = await app.inject({
        method: 'POST', url: `${base}/purchase-orders`, headers: headers(adminId),
        payload: { supplierId, orderDate: new Date().toISOString() },
      });
      expect(order.statusCode).toBe(201);
      purchaseOrderId = order.json().data.purchaseOrderId;
      const orderUrl = `${base}/purchase-orders/${purchaseOrderId}`;

      const item = await app.inject({
        method: 'POST', url: `${orderUrl}/items`, headers: headers(adminId),
        payload: { variantId: 'http-widget', variantName: 'HTTP Widget', quantity: 2, unitPrice: 3.5 },
      });
      expect(item.statusCode).toBe(201);

      for (const action of ['submit', 'approve']) {
        const response = await app.inject({ method: 'POST', url: `${orderUrl}/${action}`, headers: headers(adminId) });
        expect(response.statusCode).toBe(200);
      }
      const received = await app.inject({
        method: 'POST', url: `${orderUrl}/receive`, headers: headers(adminId), payload: { locationId },
      });
      expect(received.statusCode).toBe(200);
      expect(received.json().data.status).toBe('RECEIVED');

      const stock = await app.prisma.stock.findFirst({ where: { workspaceId, locationId, variantId: 'http-widget' } });
      expect(stock?.quantity).toBe(2);
      expect(await app.prisma.inventoryTransaction.count({ where: { workspaceId, referenceId: purchaseOrderId } })).toBe(1);
      const stockResponse = await app.inject({
        method: 'GET', url: `${base}/stock?locationId=${locationId}`, headers: headers(viewerId),
      });
      expect(stockResponse.statusCode).toBe(200);
      expect(stockResponse.json().data.items).toEqual(expect.arrayContaining([expect.objectContaining({ variantId: 'http-widget' })]));

      const emitted = await app.prisma.outboxEvent.findMany({
        where: { aggregateId: { in: [supplierId!, locationId!, purchaseOrderId!, stock!.id] } },
        select: { eventType: true },
      });
      expect(emitted.map((event) => event.eventType)).toEqual(expect.arrayContaining([
        'supplier.created', 'location.created', 'purchase_order.created',
        'purchase_order.item_received', 'stock.created',
      ]));
    } finally {
      const stockIds = (await app.prisma.stock.findMany({ where: { workspaceId }, select: { id: true } })).map((row) => row.id);
      const transactionIds = (await app.prisma.inventoryTransaction.findMany({ where: { workspaceId }, select: { id: true } })).map((row) => row.id);
      await app.prisma.outboxEvent.deleteMany({ where: {
        aggregateId: { in: [supplierId, locationId, purchaseOrderId, ...stockIds, ...transactionIds].filter((id): id is string => !!id) },
      } });
      await app.prisma.inventoryTransaction.deleteMany({ where: { workspaceId } });
      await app.prisma.stock.deleteMany({ where: { workspaceId } });
      await app.prisma.purchaseOrder.deleteMany({ where: { workspaceId } });
      await app.prisma.location.deleteMany({ where: { workspaceId } });
      await app.prisma.supplier.deleteMany({ where: { workspaceId } });
      await app.close();
      vi.unstubAllGlobals();
    }
  });
});
