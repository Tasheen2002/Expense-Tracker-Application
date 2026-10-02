import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@shared/middleware', () => ({
  workspaceAuthorizationMiddleware: async () => {},
  authenticate: async () => {},
  requireRole: () => async () => {},
  hasRole: () => true,
}));

import Fastify, { FastifyInstance } from 'fastify';
import { supplierRoutes } from '../infrastructure/http/routes/supplier.routes';
import { locationRoutes } from '../infrastructure/http/routes/location.routes';
import { purchaseOrderRoutes } from '../infrastructure/http/routes/purchase-order.routes';
import { stockRoutes } from '../infrastructure/http/routes/stock.routes';

const mockWorkspaceId = '123e4567-e89b-12d3-a456-426614174000';
const mockSupplierId = '123e4567-e89b-12d3-a456-426614174001';
const mockLocationId = '123e4567-e89b-12d3-a456-426614174002';
const mockPOId = '123e4567-e89b-12d3-a456-426614174003';
const mockItemId = '123e4567-e89b-12d3-a456-426614174004';

function createMockController() {
  return {
    createSupplier: vi.fn(async (_req, reply) => reply.status(201).send({
      success: true,
      statusCode: 201,
      message: 'Supplier created successfully',
      data: { supplierId: mockSupplierId, workspaceId: mockWorkspaceId, name: 'Acme', contactEmail: null, contactPhone: null, address: null, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    listSuppliers: vi.fn(async (_req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Suppliers retrieved successfully',
      data: { items: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } }
    })),
    getSupplier: vi.fn(async (_req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Supplier retrieved successfully',
      data: { supplierId: mockSupplierId, workspaceId: mockWorkspaceId, name: 'Acme', contactEmail: null, contactPhone: null, address: null, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    updateSupplier: vi.fn(async (_req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Supplier updated successfully',
      data: { supplierId: mockSupplierId, workspaceId: mockWorkspaceId, name: 'Acme LLC', contactEmail: null, contactPhone: null, address: null, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    deleteSupplier: vi.fn(async (_req, reply) => reply.status(204).send()),

    createLocation: vi.fn(async (_req, reply) => reply.status(201).send({
      success: true,
      statusCode: 201,
      message: 'Location created successfully',
      data: { locationId: mockLocationId, workspaceId: mockWorkspaceId, name: 'Warehouse', type: 'WAREHOUSE', address: null, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    listLocations: vi.fn(async (_req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Locations retrieved successfully',
      data: { items: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } }
    })),
    getLocation: vi.fn(async (_req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Location retrieved successfully',
      data: { locationId: mockLocationId, workspaceId: mockWorkspaceId, name: 'Warehouse', type: 'WAREHOUSE', address: null, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    updateLocation: vi.fn(async (_req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Location updated successfully',
      data: { locationId: mockLocationId, workspaceId: mockWorkspaceId, name: 'Warehouse B', type: 'WAREHOUSE', address: null, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    deleteLocation: vi.fn(async (_req, reply) => reply.status(204).send()),

    adjustStock: vi.fn(async (_req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Stock adjusted successfully',
      data: {
        stock: { stockId: mockLocationId, workspaceId: mockWorkspaceId, variantId: 'v1', locationId: mockLocationId, quantity: 10, availableQuantity: 10, reservedQuantity: 0, reorderLevel: 5, reorderQuantity: 20, isLowStock: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        transaction: { transactionId: mockSupplierId, workspaceId: mockWorkspaceId, variantId: 'v1', locationId: mockLocationId, type: 'IN', quantity: 10, referenceId: null, referenceType: null, notes: null, createdBy: 'u1', createdAt: new Date().toISOString() }
      }
    })),
    updateStockSettings: vi.fn(async (_req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Stock settings updated successfully',
      data: {
        stockId: mockLocationId, workspaceId: mockWorkspaceId, variantId: 'v1', locationId: mockLocationId,
        quantity: 10, availableQuantity: 10, reservedQuantity: 0, reorderLevel: 5,
        reorderQuantity: 20, isLowStock: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    })),
    getStock: vi.fn(async (_req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Stock retrieved successfully',
      data: { items: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } }
    })),
    listTransactions: vi.fn(async (_req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Transactions retrieved successfully',
      data: { items: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } }
    })),

    createPurchaseOrder: vi.fn(async (_req, reply) => reply.status(201).send({
      success: true,
      statusCode: 201,
      message: 'Purchase order created successfully',
      data: { purchaseOrderId: mockPOId, workspaceId: mockWorkspaceId, status: 'DRAFT', supplierId: mockSupplierId, totalAmount: '0.00', currency: 'USD', orderDate: new Date().toISOString(), expectedDate: null, receivedDate: null, notes: null, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    listPurchaseOrders: vi.fn(async (_req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Purchase orders retrieved successfully',
      data: { items: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } }
    })),
    getPurchaseOrder: vi.fn(async (_req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Purchase order retrieved successfully',
      data: { purchaseOrderId: mockPOId, workspaceId: mockWorkspaceId, status: 'DRAFT', supplierId: mockSupplierId, totalAmount: '0.00', currency: 'USD', orderDate: new Date().toISOString(), expectedDate: null, receivedDate: null, notes: null, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), items: [] }
    })),
    updatePurchaseOrder: vi.fn(async (_req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Purchase order updated successfully',
      data: { purchaseOrderId: mockPOId, workspaceId: mockWorkspaceId, status: 'DRAFT', supplierId: mockSupplierId, totalAmount: '0.00', currency: 'USD', orderDate: new Date().toISOString(), expectedDate: null, receivedDate: null, notes: null, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    deletePurchaseOrder: vi.fn(async (_req, reply) => reply.status(204).send()),
    submitPurchaseOrder: vi.fn(async (_req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Purchase order submitted successfully',
      data: { purchaseOrderId: mockPOId, workspaceId: mockWorkspaceId, status: 'SUBMITTED', supplierId: mockSupplierId, totalAmount: '0.00', currency: 'USD', orderDate: new Date().toISOString(), expectedDate: null, receivedDate: null, notes: null, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    approvePurchaseOrder: vi.fn(async (_req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Purchase order approved successfully',
      data: { purchaseOrderId: mockPOId, workspaceId: mockWorkspaceId, status: 'APPROVED', supplierId: mockSupplierId, totalAmount: '0.00', currency: 'USD', orderDate: new Date().toISOString(), expectedDate: null, receivedDate: null, notes: null, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    receivePurchaseOrder: vi.fn(async (_req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Purchase order received successfully',
      data: { purchaseOrderId: mockPOId, workspaceId: mockWorkspaceId, status: 'RECEIVED', supplierId: mockSupplierId, totalAmount: '0.00', currency: 'USD', orderDate: new Date().toISOString(), expectedDate: null, receivedDate: null, notes: null, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    cancelPurchaseOrder: vi.fn(async (_req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Purchase order cancelled successfully',
      data: { purchaseOrderId: mockPOId, workspaceId: mockWorkspaceId, status: 'CANCELLED', supplierId: mockSupplierId, totalAmount: '0.00', currency: 'USD', orderDate: new Date().toISOString(), expectedDate: null, receivedDate: null, notes: null, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    addItem: vi.fn(async (_req, reply) => reply.status(201).send({
      success: true,
      statusCode: 201,
      message: 'Item added successfully',
      data: { itemId: mockItemId, purchaseOrderId: mockPOId, variantId: 'v1', variantName: 'V1', quantity: 5, unitPrice: '10.00', receivedQuantity: 0, lineTotal: '50.00', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    removeItem: vi.fn(async (_req, reply) => reply.status(204).send()),
  };
}

async function setupTestApp(controllers: any): Promise<FastifyInstance> {
  const app = Fastify();
  app.decorate('authenticate', async () => {});
  (app as any).decorateRequest('user', null);
  (app as any).decorateRequest('workspaceMembership', null);
  app.addHook('onRequest', async (req) => {
    (req as any).user = { userId: 'u1', email: 'test@example.com' };
    (req as any).workspaceMembership = { role: 'ADMIN', workspaceId: mockWorkspaceId };
  });

  // Mock server object for route helpers
  (app as any).decorate('prisma', {});

  await supplierRoutes(app, controllers.supplierController);
  await locationRoutes(app, controllers.locationController);
  await stockRoutes(app, controllers.stockController);
  await purchaseOrderRoutes(app, controllers.purchaseOrderController);

  return app;
}

describe('Inventory Management Routes', () => {
  let app: FastifyInstance;
  let controllers: ReturnType<typeof createMockController>;

  beforeEach(async () => {
    controllers = createMockController();
    app = await setupTestApp({
      supplierController: controllers,
      locationController: controllers,
      stockController: controllers,
      purchaseOrderController: controllers,
    });
  });

  describe('Supplier Routes', () => {
    it('POST /workspaces/:workspaceId/suppliers - success', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/suppliers`,
        payload: { name: 'Acme Corp' },
      });
      expect(response.statusCode).toBe(201);
      expect(controllers.createSupplier).toHaveBeenCalled();
    });

    it('POST /workspaces/:workspaceId/suppliers - validation error (missing name)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/suppliers`,
        payload: {},
      });
      expect(response.statusCode).toBe(400);
      expect(controllers.createSupplier).not.toHaveBeenCalled();
    });

    it('GET /workspaces/:workspaceId/suppliers - success', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/workspaces/${mockWorkspaceId}/suppliers`,
      });
      expect(response.statusCode).toBe(200);
      expect(controllers.listSuppliers).toHaveBeenCalled();
    });

    it('rejects blank names and overlong contact emails', async () => {
      const url = `/workspaces/${mockWorkspaceId}/suppliers`;
      const blank = await app.inject({ method: 'POST', url, payload: { name: '   ' } });
      const longEmail = await app.inject({
        method: 'POST', url,
        payload: { name: 'Acme', contactEmail: `${'a'.repeat(250)}@example.com` },
      });
      expect(blank.statusCode).toBe(400);
      expect(longEmail.statusCode).toBe(400);
      expect(controllers.createSupplier).not.toHaveBeenCalled();
    });

    it('normalizes a valid supplier name before dispatch', async () => {
      const response = await app.inject({
        method: 'POST', url: `/workspaces/${mockWorkspaceId}/suppliers`,
        payload: { name: '  Acme  ' },
      });
      expect(response.statusCode).toBe(201);
      expect(controllers.createSupplier.mock.calls[0][0].body.name).toBe('Acme');
    });
  });

  describe('Location Routes', () => {
    it('POST /workspaces/:workspaceId/locations - success', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/locations`,
        payload: { name: 'Warehouse A' },
      });
      expect(response.statusCode).toBe(201);
      expect(controllers.createLocation).toHaveBeenCalled();
    });

    it('POST /workspaces/:workspaceId/locations - validation error (invalid UUID)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/invalid-uuid/locations`,
        payload: { name: 'Warehouse A' },
      });
      expect(response.statusCode).toBe(400);
      expect(controllers.createLocation).not.toHaveBeenCalled();
    });

    it('rejects blank location names', async () => {
      const response = await app.inject({
        method: 'POST', url: `/workspaces/${mockWorkspaceId}/locations`,
        payload: { name: '   ' },
      });
      expect(response.statusCode).toBe(400);
      expect(controllers.createLocation).not.toHaveBeenCalled();
    });
  });

  describe('Stock Routes', () => {
    it('POST /workspaces/:workspaceId/stock/adjust - success', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/stock/adjust`,
        payload: {
          variantId: 'v1',
          locationId: mockLocationId,
          quantity: 10,
          type: 'IN',
        },
      });
      expect(response.statusCode).toBe(200);
      expect(controllers.adjustStock).toHaveBeenCalled();
    });

    it('PATCH /workspaces/:workspaceId/stock/:stockId/settings validates input and dispatches', async () => {
      const url = `/workspaces/${mockWorkspaceId}/stock/${mockLocationId}/settings`;
      const invalid = await app.inject({ method: 'PATCH', url, payload: {} });
      expect(invalid.statusCode).toBe(400);
      expect(controllers.updateStockSettings).not.toHaveBeenCalled();

      const updated = await app.inject({ method: 'PATCH', url, payload: { reorderLevel: 5 } });
      expect(updated.statusCode).toBe(200);
      expect(controllers.updateStockSettings).toHaveBeenCalledOnce();
    });

    it('rejects unsupported transfers and whitespace variant IDs', async () => {
      const url = `/workspaces/${mockWorkspaceId}/stock/adjust`;
      const base = { variantId: 'widget', locationId: mockLocationId, quantity: 1, type: 'IN' };
      const transfer = await app.inject({ method: 'POST', url, payload: { ...base, type: 'TRANSFER' } });
      const blankVariant = await app.inject({ method: 'POST', url, payload: { ...base, variantId: '   ' } });
      expect(transfer.statusCode).toBe(400);
      expect(blankVariant.statusCode).toBe(400);
      expect(controllers.adjustStock).not.toHaveBeenCalled();
    });
  });

  describe('Purchase Order Routes', () => {
    it('POST /workspaces/:workspaceId/purchase-orders - success', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/workspaces/${mockWorkspaceId}/purchase-orders`,
        payload: {
          supplierId: mockSupplierId,
          orderDate: new Date().toISOString(),
        },
      });
      expect(response.statusCode).toBe(201);
      expect(controllers.createPurchaseOrder).toHaveBeenCalled();
    });

    it('requires a valid destination location when receiving', async () => {
      const url = `/workspaces/${mockWorkspaceId}/purchase-orders/${mockPOId}/receive`;
      const missing = await app.inject({ method: 'POST', url, payload: {} });
      expect(missing.statusCode).toBe(400);
      expect(controllers.receivePurchaseOrder).not.toHaveBeenCalled();

      const received = await app.inject({ method: 'POST', url, payload: { locationId: mockLocationId } });
      expect(received.statusCode).toBe(200);
      expect(controllers.receivePurchaseOrder).toHaveBeenCalled();
    });

    it('rejects an expected date before the order date', async () => {
      const response = await app.inject({
        method: 'POST', url: `/workspaces/${mockWorkspaceId}/purchase-orders`,
        payload: {
          supplierId: mockSupplierId,
          orderDate: '2026-01-02T00:00:00.000Z',
          expectedDate: '2026-01-01T00:00:00.000Z',
        },
      });
      expect(response.statusCode).toBe(400);
      expect(controllers.createPurchaseOrder).not.toHaveBeenCalled();
    });

    it('rejects an unsupported purchase-order currency', async () => {
      const response = await app.inject({
        method: 'POST', url: `/workspaces/${mockWorkspaceId}/purchase-orders`,
        payload: {
          supplierId: mockSupplierId,
          orderDate: '2026-01-02T00:00:00.000Z',
          currency: 'XYZ',
        },
      });
      expect(response.statusCode).toBe(400);
      expect(controllers.createPurchaseOrder).not.toHaveBeenCalled();
    });

    it('rejects invalid item precision, line totals, and blank variants', async () => {
      const url = `/workspaces/${mockWorkspaceId}/purchase-orders/${mockPOId}/items`;
      const base = { variantId: 'widget', variantName: 'Widget', quantity: 2, unitPrice: 1 };
      for (const payload of [
        { ...base, unitPrice: 1.001 },
        { ...base, quantity: 2, unitPrice: 9999999999.99 },
        { ...base, variantId: '   ' },
        { ...base, variantName: '   ' },
      ]) {
        const response = await app.inject({ method: 'POST', url, payload });
        expect(response.statusCode).toBe(400);
      }
      expect(controllers.addItem).not.toHaveBeenCalled();
    });

    it('accepts a valid two-decimal item price', async () => {
      const response = await app.inject({
        method: 'POST', url: `/workspaces/${mockWorkspaceId}/purchase-orders/${mockPOId}/items`,
        payload: { variantId: ' widget ', variantName: ' Widget ', quantity: 2, unitPrice: 0.01 },
      });
      expect(response.statusCode).toBe(201);
      expect(controllers.addItem.mock.calls[0][0].body).toMatchObject({
        variantId: 'widget', variantName: 'Widget', quantity: 2, unitPrice: 0.01,
      });
    });
  });

  it.each([
    { method: 'GET', path: `suppliers/${mockSupplierId}`, handler: 'getSupplier', status: 200 },
    { method: 'PATCH', path: `suppliers/${mockSupplierId}`, handler: 'updateSupplier', status: 200, payload: { name: 'Acme LLC' } },
    { method: 'DELETE', path: `suppliers/${mockSupplierId}`, handler: 'deleteSupplier', status: 204 },
    { method: 'GET', path: 'locations', handler: 'listLocations', status: 200 },
    { method: 'GET', path: `locations/${mockLocationId}`, handler: 'getLocation', status: 200 },
    { method: 'PATCH', path: `locations/${mockLocationId}`, handler: 'updateLocation', status: 200, payload: { name: 'Warehouse B' } },
    { method: 'DELETE', path: `locations/${mockLocationId}`, handler: 'deleteLocation', status: 204 },
    { method: 'GET', path: 'stock', handler: 'getStock', status: 200 },
    { method: 'GET', path: 'stock/transactions', handler: 'listTransactions', status: 200 },
    { method: 'GET', path: 'purchase-orders', handler: 'listPurchaseOrders', status: 200 },
    { method: 'GET', path: `purchase-orders/${mockPOId}`, handler: 'getPurchaseOrder', status: 200 },
    { method: 'PATCH', path: `purchase-orders/${mockPOId}`, handler: 'updatePurchaseOrder', status: 200, payload: { notes: 'Updated' } },
    { method: 'DELETE', path: `purchase-orders/${mockPOId}`, handler: 'deletePurchaseOrder', status: 204 },
    { method: 'POST', path: `purchase-orders/${mockPOId}/submit`, handler: 'submitPurchaseOrder', status: 200 },
    { method: 'POST', path: `purchase-orders/${mockPOId}/approve`, handler: 'approvePurchaseOrder', status: 200 },
    { method: 'POST', path: `purchase-orders/${mockPOId}/cancel`, handler: 'cancelPurchaseOrder', status: 200 },
    { method: 'DELETE', path: `purchase-orders/${mockPOId}/items/${mockItemId}`, handler: 'removeItem', status: 204 },
  ] as const)('$method /workspaces/:workspaceId/$path dispatches $handler', async ({ method, path, handler, status, ...rest }) => {
    const response = await app.inject({
      method,
      url: `/workspaces/${mockWorkspaceId}/${path}`,
      ...('payload' in rest ? { payload: rest.payload } : {}),
    });
    expect(response.statusCode).toBe(status);
    expect(controllers[handler]).toHaveBeenCalledOnce();
  });
});
