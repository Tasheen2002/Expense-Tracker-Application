import { FastifyInstance } from 'fastify';
import { StockController } from '../controllers/stock.controller';
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
  adjustStockSchema,
  workspaceParamsSchema,
  listStockQuerySchema,
  listTransactionsQuerySchema,
} from '../validation/inventory.schema';

const stockSchema = {
  type: 'object',
  properties: {
    stockId: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string' },
    variantId: { type: 'string' },
    locationId: { type: 'string' },
    quantity: { type: 'number' },
    reservedQuantity: { type: 'number' },
    availableQuantity: { type: 'number' },
    reorderLevel: { type: 'number' },
    reorderQuantity: { type: 'number' },
    isLowStock: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const transactionSchema = {
  type: 'object',
  properties: {
    transactionId: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string' },
    variantId: { type: 'string' },
    locationId: { type: 'string' },
    type: { type: 'string', enum: ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'] },
    quantity: { type: 'number' },
    referenceId: { type: 'string', nullable: true },
    referenceType: { type: 'string', nullable: true },
    notes: { type: 'string', nullable: true },
    createdBy: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function stockRoutes(
  fastify: FastifyInstance,
  controller: StockController
) {
  // Apply write rate limiting to all mutation routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Adjust stock
  fastify.post(
    '/workspaces/:workspaceId/stock/adjust',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        validateBody(adjustStockSchema),
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Inventory - Stock'],
        description: 'Adjust stock levels (IN, OUT, TRANSFER, ADJUSTMENT)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['variantId', 'locationId', 'quantity', 'type'],
          properties: {
            variantId: { type: 'string', minLength: 1 },
            locationId: { type: 'string', format: 'uuid' },
            quantity: { type: 'number', minimum: 1 },
            type: { type: 'string', enum: ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'] },
            notes: { type: 'string', nullable: true },
            referenceId: { type: 'string', format: 'uuid', nullable: true },
            referenceType: { type: 'string', nullable: true },
          },
        },
        response: {
          200: {
            description: 'Stock adjusted successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  stock: stockSchema,
                  transaction: transactionSchema,
                },
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.adjustStock(request as AuthenticatedRequest, reply)
  );

  // Get stock levels
  fastify.get(
    '/workspaces/:workspaceId/stock',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        validateQuery(listStockQuerySchema),
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Inventory - Stock'],
        description: 'Get stock levels',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Stock retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: stockSchema },
                  pagination: {
                    type: 'object',
                    properties: {
                      total: { type: 'integer' },
                      limit: { type: 'integer' },
                      offset: { type: 'integer' },
                      hasMore: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getStock(request as AuthenticatedRequest, reply)
  );

  // List inventory transactions
  fastify.get(
    '/workspaces/:workspaceId/stock/transactions',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        validateQuery(listTransactionsQuerySchema),
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Inventory - Stock'],
        description: 'List inventory transactions',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Transactions retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: transactionSchema },
                  pagination: {
                    type: 'object',
                    properties: {
                      total: { type: 'integer' },
                      limit: { type: 'integer' },
                      offset: { type: 'integer' },
                      hasMore: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.listTransactions(request as AuthenticatedRequest, reply)
  );
}
