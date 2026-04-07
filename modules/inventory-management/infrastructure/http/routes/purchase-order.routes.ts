import { FastifyInstance } from 'fastify';
import { PurchaseOrderController } from '../controllers/purchase-order.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { requireRole } from '@shared/middleware/role-authorization.middleware';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  addPurchaseOrderItemSchema,
  workspaceParamsSchema,
  purchaseOrderParamsSchema,
  purchaseOrderItemParamsSchema,
  listPurchaseOrdersQuerySchema,
} from '../validation/inventory.schema';

const purchaseOrderSchema = {
  type: 'object',
  properties: {
    purchaseOrderId: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string' },
    supplierId: { type: 'string' },
    status: {
      type: 'string',
      enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'RECEIVED', 'CANCELLED'],
    },
    orderDate: { type: 'string', format: 'date-time' },
    expectedDate: { type: 'string', format: 'date-time', nullable: true },
    receivedDate: { type: 'string', format: 'date-time', nullable: true },
    notes: { type: 'string', nullable: true },
    totalAmount: { type: 'string' },
    currency: { type: 'string' },
    createdBy: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const purchaseOrderItemSchema = {
  type: 'object',
  properties: {
    itemId: { type: 'string', format: 'uuid' },
    purchaseOrderId: { type: 'string' },
    variantId: { type: 'string' },
    variantName: { type: 'string' },
    quantity: { type: 'number' },
    unitPrice: { type: 'string' },
    receivedQuantity: { type: 'number' },
    lineTotal: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const purchaseOrderWithItemsSchema = {
  type: 'object',
  properties: {
    ...purchaseOrderSchema.properties,
    items: { type: 'array', items: purchaseOrderItemSchema },
  },
};

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function purchaseOrderRoutes(
  fastify: FastifyInstance,
  controller: PurchaseOrderController
) {
  // Apply write rate limiting to all mutation routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create purchase order
  fastify.post(
    '/workspaces/:workspaceId/purchase-orders',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        validateBody(createPurchaseOrderSchema),
        requireRole(['owner', 'admin', 'manager']),
      ],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Create a new purchase order',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['supplierId', 'orderDate'],
          properties: {
            supplierId: { type: 'string', format: 'uuid' },
            orderDate: { type: 'string', format: 'date-time' },
            expectedDate: { type: 'string', format: 'date-time', nullable: true },
            notes: { type: 'string', nullable: true },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
          },
        },
        response: {
          201: {
            description: 'Purchase order created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: purchaseOrderSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.createPurchaseOrder(request as AuthenticatedRequest, reply)
  );

  // List purchase orders
  fastify.get(
    '/workspaces/:workspaceId/purchase-orders',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        validateQuery(listPurchaseOrdersQuerySchema),
        requireRole(['owner', 'admin', 'manager', 'viewer']),
      ],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'List purchase orders',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Purchase orders retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: purchaseOrderSchema },
                  total: { type: 'number' },
                  limit: { type: 'number' },
                  offset: { type: 'number' },
                  hasMore: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.listPurchaseOrders(request as AuthenticatedRequest, reply)
  );

  // Get purchase order by ID
  fastify.get(
    '/workspaces/:workspaceId/purchase-orders/:purchaseOrderId',
    {
      preValidation: [validateParams(purchaseOrderParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'manager', 'viewer'])],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Get purchase order by ID with items',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Purchase order retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: purchaseOrderWithItemsSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getPurchaseOrder(request as AuthenticatedRequest, reply)
  );

  // Update purchase order
  fastify.patch(
    '/workspaces/:workspaceId/purchase-orders/:purchaseOrderId',
    {
      preValidation: [validateParams(purchaseOrderParamsSchema)],
      preHandler: [
        validateBody(updatePurchaseOrderSchema),
        requireRole(['owner', 'admin', 'manager']),
      ],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Update purchase order (draft only)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            notes: { type: 'string', nullable: true },
            expectedDate: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        response: {
          200: {
            description: 'Purchase order updated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: purchaseOrderSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.updatePurchaseOrder(request as AuthenticatedRequest, reply)
  );

  // Delete purchase order
  fastify.delete(
    '/workspaces/:workspaceId/purchase-orders/:purchaseOrderId',
    {
      preValidation: [validateParams(purchaseOrderParamsSchema)],
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Delete purchase order',
        security: [{ bearerAuth: [] }],
        response: {
          204: {
            description: 'No Content',
            type: 'null',
          },
        },
      },
    },
    (request, reply) =>
      controller.deletePurchaseOrder(request as AuthenticatedRequest, reply)
  );

  // Submit purchase order
  fastify.post(
    '/workspaces/:workspaceId/purchase-orders/:purchaseOrderId/submit',
    {
      preValidation: [validateParams(purchaseOrderParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'manager'])],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Submit purchase order for approval',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Purchase order submitted successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: purchaseOrderSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.submitPurchaseOrder(request as AuthenticatedRequest, reply)
  );

  // Approve purchase order
  fastify.post(
    '/workspaces/:workspaceId/purchase-orders/:purchaseOrderId/approve',
    {
      preValidation: [validateParams(purchaseOrderParamsSchema)],
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Approve purchase order',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Purchase order approved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: purchaseOrderSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.approvePurchaseOrder(request as AuthenticatedRequest, reply)
  );

  // Receive purchase order
  fastify.post(
    '/workspaces/:workspaceId/purchase-orders/:purchaseOrderId/receive',
    {
      preValidation: [validateParams(purchaseOrderParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'manager'])],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Mark purchase order as received',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Purchase order received successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: purchaseOrderSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.receivePurchaseOrder(request as AuthenticatedRequest, reply)
  );

  // Cancel purchase order
  fastify.post(
    '/workspaces/:workspaceId/purchase-orders/:purchaseOrderId/cancel',
    {
      preValidation: [validateParams(purchaseOrderParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'manager'])],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Cancel purchase order',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Purchase order cancelled successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: purchaseOrderSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.cancelPurchaseOrder(request as AuthenticatedRequest, reply)
  );

  // Add item to purchase order
  fastify.post(
    '/workspaces/:workspaceId/purchase-orders/:purchaseOrderId/items',
    {
      preValidation: [validateParams(purchaseOrderParamsSchema)],
      preHandler: [
        validateBody(addPurchaseOrderItemSchema),
        requireRole(['owner', 'admin', 'manager']),
      ],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Add item to purchase order',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['variantId', 'variantName', 'quantity', 'unitPrice'],
          properties: {
            variantId: { type: 'string', minLength: 1 },
            variantName: { type: 'string', minLength: 1 },
            quantity: { type: 'number', minimum: 1 },
            unitPrice: { type: 'number', minimum: 0 },
          },
        },
        response: {
          201: {
            description: 'Item added successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: purchaseOrderItemSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.addItem(request as AuthenticatedRequest, reply)
  );

  // Remove item from purchase order
  fastify.delete(
    '/workspaces/:workspaceId/purchase-orders/:purchaseOrderId/items/:itemId',
    {
      preValidation: [validateParams(purchaseOrderItemParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'manager'])],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Remove item from purchase order',
        security: [{ bearerAuth: [] }],
        response: {
          204: {
            description: 'No Content',
            type: 'null',
          },
        },
      },
    },
    (request, reply) =>
      controller.removeItem(request as AuthenticatedRequest, reply)
  );
}
