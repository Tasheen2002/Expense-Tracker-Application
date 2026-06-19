import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock(
  '../../../apps/api/src/shared/middleware/rate-limiter.middleware',
  () => ({
    createRateLimiter: () => async () => {},
    RateLimitPresets: {
      writeOperations: { windowMs: 60000, maxRequests: 100 },
      auth: { windowMs: 60000, maxRequests: 100 },
    },
    userKeyGenerator: () => 'test-user',
    endpointKeyGenerator: () => 'test-endpoint',
    defaultKeyGenerator: () => 'test-user',
  })
);

vi.mock(
  '../../../apps/api/src/shared/middleware/role-authorization.middleware',
  () => ({
    requireRole: () => async () => {},
    RolePermissions: {
      OWNER_ONLY: async () => {},
      ADMIN_LEVEL: async () => {},
      MANAGER_LEVEL: async () => {},
      MEMBER_LEVEL: async () => {},
    },
    hasRole: () => true,
  })
);

vi.mock('@shared/middleware', () => ({
  workspaceAuthorizationMiddleware: async () => {},
  authenticate: async () => {},
  requireRole: () => async () => {},
  hasRole: () => true,
}));

import Fastify, { FastifyInstance } from 'fastify';
import { SupplierController } from '../infrastructure/http/controllers/supplier.controller';
import { LocationController } from '../infrastructure/http/controllers/location.controller';
import { PurchaseOrderController } from '../infrastructure/http/controllers/purchase-order.controller';
import { StockController } from '../infrastructure/http/controllers/stock.controller';
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
    createSupplier: vi.fn(async (req, reply) => reply.status(201).send({
      success: true,
      statusCode: 201,
      message: 'Supplier created successfully',
      data: { supplierId: mockSupplierId, workspaceId: mockWorkspaceId, name: 'Acme', contactEmail: null, contactPhone: null, address: null, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    listSuppliers: vi.fn(async (req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Suppliers retrieved successfully',
      data: { items: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } }
    })),
    getSupplier: vi.fn(async (req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Supplier retrieved successfully',
      data: { supplierId: mockSupplierId, workspaceId: mockWorkspaceId, name: 'Acme', contactEmail: null, contactPhone: null, address: null, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    updateSupplier: vi.fn(async (req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Supplier updated successfully',
      data: { supplierId: mockSupplierId, workspaceId: mockWorkspaceId, name: 'Acme LLC', contactEmail: null, contactPhone: null, address: null, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    deleteSupplier: vi.fn(async (req, reply) => reply.status(204).send()),

    createLocation: vi.fn(async (req, reply) => reply.status(201).send({
      success: true,
      statusCode: 201,
      message: 'Location created successfully',
      data: { locationId: mockLocationId, workspaceId: mockWorkspaceId, name: 'Warehouse', type: 'WAREHOUSE', address: null, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    listLocations: vi.fn(async (req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Locations retrieved successfully',
      data: { items: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } }
    })),
    getLocation: vi.fn(async (req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Location retrieved successfully',
      data: { locationId: mockLocationId, workspaceId: mockWorkspaceId, name: 'Warehouse', type: 'WAREHOUSE', address: null, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    updateLocation: vi.fn(async (req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Location updated successfully',
      data: { locationId: mockLocationId, workspaceId: mockWorkspaceId, name: 'Warehouse B', type: 'WAREHOUSE', address: null, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    deleteLocation: vi.fn(async (req, reply) => reply.status(204).send()),

    adjustStock: vi.fn(async (req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Stock adjusted successfully',
      data: {
        stock: { stockId: mockLocationId, workspaceId: mockWorkspaceId, variantId: 'v1', locationId: mockLocationId, quantity: 10, availableQuantity: 10, reservedQuantity: 0, reorderLevel: 5, reorderQuantity: 20, isLowStock: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        transaction: { transactionId: mockSupplierId, workspaceId: mockWorkspaceId, variantId: 'v1', locationId: mockLocationId, type: 'IN', quantity: 10, referenceId: null, referenceType: null, notes: null, createdBy: 'u1', createdAt: new Date().toISOString() }
      }
    })),
    getStock: vi.fn(async (req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Stock retrieved successfully',
      data: { items: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } }
    })),
    listTransactions: vi.fn(async (req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Transactions retrieved successfully',
      data: { items: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } }
    })),

    createPurchaseOrder: vi.fn(async (req, reply) => reply.status(201).send({
      success: true,
      statusCode: 201,
      message: 'Purchase order created successfully',
      data: { purchaseOrderId: mockPOId, workspaceId: mockWorkspaceId, status: 'DRAFT', supplierId: mockSupplierId, totalAmount: '0.00', currency: 'USD', orderDate: new Date().toISOString(), expectedDate: null, receivedDate: null, notes: null, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    listPurchaseOrders: vi.fn(async (req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Purchase orders retrieved successfully',
      data: { items: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } }
    })),
    getPurchaseOrder: vi.fn(async (req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Purchase order retrieved successfully',
      data: { purchaseOrderId: mockPOId, workspaceId: mockWorkspaceId, status: 'DRAFT', supplierId: mockSupplierId, totalAmount: '0.00', currency: 'USD', orderDate: new Date().toISOString(), expectedDate: null, receivedDate: null, notes: null, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), items: [] }
    })),
    updatePurchaseOrder: vi.fn(async (req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Purchase order updated successfully',
      data: { purchaseOrderId: mockPOId, workspaceId: mockWorkspaceId, status: 'DRAFT', supplierId: mockSupplierId, totalAmount: '0.00', currency: 'USD', orderDate: new Date().toISOString(), expectedDate: null, receivedDate: null, notes: null, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    deletePurchaseOrder: vi.fn(async (req, reply) => reply.status(204).send()),
    submitPurchaseOrder: vi.fn(async (req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Purchase order submitted successfully',
      data: { purchaseOrderId: mockPOId, workspaceId: mockWorkspaceId, status: 'SUBMITTED', supplierId: mockSupplierId, totalAmount: '0.00', currency: 'USD', orderDate: new Date().toISOString(), expectedDate: null, receivedDate: null, notes: null, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    approvePurchaseOrder: vi.fn(async (req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Purchase order approved successfully',
      data: { purchaseOrderId: mockPOId, workspaceId: mockWorkspaceId, status: 'APPROVED', supplierId: mockSupplierId, totalAmount: '0.00', currency: 'USD', orderDate: new Date().toISOString(), expectedDate: null, receivedDate: null, notes: null, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    receivePurchaseOrder: vi.fn(async (req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Purchase order received successfully',
      data: { purchaseOrderId: mockPOId, workspaceId: mockWorkspaceId, status: 'RECEIVED', supplierId: mockSupplierId, totalAmount: '0.00', currency: 'USD', orderDate: new Date().toISOString(), expectedDate: null, receivedDate: null, notes: null, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    cancelPurchaseOrder: vi.fn(async (req, reply) => reply.status(200).send({
      success: true,
      statusCode: 200,
      message: 'Purchase order cancelled successfully',
      data: { purchaseOrderId: mockPOId, workspaceId: mockWorkspaceId, status: 'CANCELLED', supplierId: mockSupplierId, totalAmount: '0.00', currency: 'USD', orderDate: new Date().toISOString(), expectedDate: null, receivedDate: null, notes: null, createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    addItem: vi.fn(async (req, reply) => reply.status(201).send({
      success: true,
      statusCode: 201,
      message: 'Item added successfully',
      data: { itemId: mockItemId, purchaseOrderId: mockPOId, variantId: 'v1', variantName: 'V1', quantity: 5, unitPrice: '10.00', receivedQuantity: 0, lineTotal: '50.00', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    })),
    removeItem: vi.fn(async (req, reply) => reply.status(204).send()),
  };
}

async function setupTestApp(controllers: any): Promise<FastifyInstance> {
  const app = Fastify();
  app.decorate('authenticate', async () => {});
  app.decorateRequest('user', { userId: 'u1', email: 'test@example.com' });
  app.decorateRequest('workspaceMembership', { role: 'ADMIN' });

  // Mock server object for route helpers
  app.decorate('prisma', {});

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
  });
});
