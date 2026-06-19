import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PurchaseOrderController } from '../controllers/purchase-order.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import {
  validateBody,
  validateQuery,
} from '../validation/validator';
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  addPurchaseOrderItemSchema,
  listPurchaseOrdersQuerySchema,
  workspaceParamsJsonSchema,
  purchaseOrderParamsJsonSchema,
  purchaseOrderItemParamsJsonSchema,
  createPurchaseOrderBodyJsonSchema,
  updatePurchaseOrderBodyJsonSchema,
  addPurchaseOrderItemBodyJsonSchema,
  listPurchaseOrdersQueryJsonSchema,
  purchaseOrderEnvelopeJsonSchema,
  purchaseOrderWithItemsEnvelopeJsonSchema,
  paginatedPurchaseOrdersEnvelopeJsonSchema,
  purchaseOrderItemEnvelopeJsonSchema,
} from '../validation/inventory.schema';
import { noContentResponse } from '@shared/http/response-schemas';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function purchaseOrderRoutes(
  fastify: FastifyInstance,
  controller: PurchaseOrderController
): Promise<void> {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(
      request as AuthenticatedRequest,
      reply,
      request.server.prisma
    );
  };

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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(createPurchaseOrderSchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Create a new purchase order',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createPurchaseOrderBodyJsonSchema,
        response: {
          201: purchaseOrderEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(listPurchaseOrdersQuerySchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'List purchase orders',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: listPurchaseOrdersQueryJsonSchema,
        response: {
          200: paginatedPurchaseOrdersEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Get purchase order by ID with items',
        security: [{ bearerAuth: [] }],
        params: purchaseOrderParamsJsonSchema,
        response: {
          200: purchaseOrderWithItemsEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(updatePurchaseOrderSchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Update purchase order (draft only)',
        security: [{ bearerAuth: [] }],
        params: purchaseOrderParamsJsonSchema,
        body: updatePurchaseOrderBodyJsonSchema,
        response: {
          200: purchaseOrderEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Delete purchase order',
        security: [{ bearerAuth: [] }],
        params: purchaseOrderParamsJsonSchema,
        response: {
          204: noContentResponse,
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
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Submit purchase order for approval',
        security: [{ bearerAuth: [] }],
        params: purchaseOrderParamsJsonSchema,
        response: {
          200: purchaseOrderEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Approve purchase order',
        security: [{ bearerAuth: [] }],
        params: purchaseOrderParamsJsonSchema,
        response: {
          200: purchaseOrderEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Mark purchase order as received',
        security: [{ bearerAuth: [] }],
        params: purchaseOrderParamsJsonSchema,
        response: {
          200: purchaseOrderEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Cancel purchase order',
        security: [{ bearerAuth: [] }],
        params: purchaseOrderParamsJsonSchema,
        response: {
          200: purchaseOrderEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(addPurchaseOrderItemSchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Add item to purchase order',
        security: [{ bearerAuth: [] }],
        params: purchaseOrderParamsJsonSchema,
        body: addPurchaseOrderItemBodyJsonSchema,
        response: {
          201: purchaseOrderItemEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Inventory - Purchase Order'],
        description: 'Remove item from purchase order',
        security: [{ bearerAuth: [] }],
        params: purchaseOrderItemParamsJsonSchema,
        response: {
          204: noContentResponse,
        },
      },
    },
    (request, reply) =>
      controller.removeItem(request as AuthenticatedRequest, reply)
  );
}
