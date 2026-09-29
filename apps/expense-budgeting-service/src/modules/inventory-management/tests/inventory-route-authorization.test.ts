import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { registerInventoryRoutes } from '../infrastructure/http/routes';
import type { SupplierController } from '../infrastructure/http/controllers/supplier.controller';
import type { LocationController } from '../infrastructure/http/controllers/location.controller';
import type { PurchaseOrderController } from '../infrastructure/http/controllers/purchase-order.controller';
import type { StockController } from '../infrastructure/http/controllers/stock.controller';

describe('inventory route authorization and write rate limiting', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const workspaceId = randomUUID();
  const foreignWorkspaceId = randomUUID();
  const supplierId = randomUUID();
  const locationId = randomUUID();
  const purchaseOrderId = randomUUID();
  const itemId = randomUUID();
  const adminId = randomUUID();
  const otherAdminId = randomUUID();
  const managerId = randomUUID();
  const viewerId = randomUUID();
  const roles = new Map<string, string>([
    [adminId, 'ADMIN'],
    [otherAdminId, 'ADMIN'],
    [managerId, 'MANAGER'],
    [viewerId, 'VIEWER'],
  ]);
  const deleteSupplier = vi.fn(async (_request: FastifyRequest, reply: FastifyReply) => reply.status(204).send());
  const deleteLocation = vi.fn(async (_request: FastifyRequest, reply: FastifyReply) => reply.status(204).send());
  const deletePurchaseOrder = vi.fn(async (_request: FastifyRequest, reply: FastifyReply) => reply.status(204).send());
  const removeItem = vi.fn(async (_request: FastifyRequest, reply: FastifyReply) => reply.status(204).send());
  const createPurchaseOrder = vi.fn();
  const updatePurchaseOrder = vi.fn();
  const submitPurchaseOrder = vi.fn();
  const cancelPurchaseOrder = vi.fn();
  const addItem = vi.fn();
  const listSuppliers = vi.fn(async (_request: FastifyRequest, reply: FastifyReply) => reply.status(200).send({
    success: true, statusCode: 200, message: 'Suppliers retrieved',
    data: { items: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } },
  }));
  const app = Fastify();

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    const prisma = {
      workspaceMembership: {
        findUnique: vi.fn(async ({ where }: { where: { userId_workspaceId: { userId: string; workspaceId: string } } }) => {
          const { userId, workspaceId: requestedWorkspace } = where.userId_workspaceId;
          const role = roles.get(userId);
          return role && requestedWorkspace === workspaceId ? { role } : null;
        }),
      },
    } as unknown as PrismaClient;
    app.decorate('prisma', prisma);
    app.decorate('authenticate', async (request: FastifyRequest) => {
      const userId = request.headers['x-user-id'];
      if (typeof userId !== 'string') {
        const error = new Error('Unauthorized') as Error & { statusCode: number };
        error.statusCode = 401;
        throw error;
      }
      request.user = { userId, email: `${userId}@example.com` };
    });
    await registerInventoryRoutes(app, {
      supplierController: { deleteSupplier, listSuppliers } as unknown as SupplierController,
      locationController: { deleteLocation } as unknown as LocationController,
      purchaseOrderController: {
        deletePurchaseOrder, removeItem, createPurchaseOrder,
        updatePurchaseOrder, submitPurchaseOrder, cancelPurchaseOrder, addItem,
      } as unknown as PurchaseOrderController,
      stockController: {} as StockController,
    }, prisma);
  });

  afterAll(async () => {
    process.env.NODE_ENV = originalNodeEnv;
    await app.close();
  });

  const headers = (userId: string) => ({ 'x-user-id': userId });
  const supplierUrl = `/api/v1/workspaces/${workspaceId}/suppliers/${supplierId}`;
  const locationUrl = `/api/v1/workspaces/${workspaceId}/locations/${locationId}`;
  const orderUrl = `/api/v1/workspaces/${workspaceId}/purchase-orders/${purchaseOrderId}`;

  it('authenticates before limiting and counts each write once across route files', async () => {
    const unauthenticated = await app.inject({ method: 'DELETE', url: supplierUrl });
    expect(unauthenticated.statusCode).toBe(401);
    expect(unauthenticated.headers['x-ratelimit-remaining']).toBeUndefined();

    for (const [url, remaining] of [[supplierUrl, '29'], [locationUrl, '28'], [orderUrl, '27']]) {
      const response = await app.inject({ method: 'DELETE', url, headers: headers(adminId) });
      expect(response.statusCode).toBe(204);
      expect(response.headers['x-ratelimit-remaining']).toBe(remaining);
    }
    const otherUser = await app.inject({ method: 'DELETE', url: supplierUrl, headers: headers(otherAdminId) });
    expect(otherUser.statusCode).toBe(204);
    expect(otherUser.headers['x-ratelimit-remaining']).toBe('29');

    const read = await app.inject({
      method: 'GET', url: `/api/v1/workspaces/${workspaceId}/suppliers`, headers: headers(viewerId),
    });
    expect(read.statusCode).toBe(200);
    expect(read.headers['x-ratelimit-remaining']).toBeUndefined();
  });

  it('rejects foreign-workspace requests and viewer purchase-order writes', async () => {
    const foreign = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${foreignWorkspaceId}/suppliers/${supplierId}`,
      headers: headers(adminId),
    });
    expect(foreign.statusCode).toBe(403);
    expect(deleteSupplier).toHaveBeenCalledTimes(2);

    const base = `/api/v1/workspaces/${workspaceId}/purchase-orders`;
    const viewerHeaders = headers(viewerId);
    const denied = [
      { method: 'POST' as const, url: base, payload: { supplierId, orderDate: '2026-01-01T00:00:00.000Z' } },
      { method: 'PATCH' as const, url: orderUrl, payload: { notes: 'Change' } },
      { method: 'POST' as const, url: `${orderUrl}/submit` },
      { method: 'POST' as const, url: `${orderUrl}/cancel` },
      { method: 'POST' as const, url: `${orderUrl}/items`, payload: { variantId: 'widget', variantName: 'Widget', quantity: 1, unitPrice: 1 } },
      { method: 'DELETE' as const, url: `${orderUrl}/items/${itemId}` },
    ];
    for (const request of denied) {
      const response = await app.inject({ ...request, headers: viewerHeaders });
      expect(response.statusCode).toBe(403);
    }
    expect(createPurchaseOrder).not.toHaveBeenCalled();
    expect(updatePurchaseOrder).not.toHaveBeenCalled();
    expect(submitPurchaseOrder).not.toHaveBeenCalled();
    expect(cancelPurchaseOrder).not.toHaveBeenCalled();
    expect(addItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();

    const manager = await app.inject({
      method: 'DELETE', url: `${orderUrl}/items/${itemId}`, headers: headers(managerId),
    });
    expect(manager.statusCode).toBe(204);
    expect(removeItem).toHaveBeenCalledOnce();
  });
});
