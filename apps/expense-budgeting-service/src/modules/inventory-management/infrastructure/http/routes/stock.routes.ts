import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { StockController } from '../controllers/stock.controller';
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
  adjustStockSchema,
  listStockQuerySchema,
  listTransactionsQuerySchema,
  workspaceParamsJsonSchema,
  adjustStockBodyJsonSchema,
  listStockQueryJsonSchema,
  listTransactionsQueryJsonSchema,
  adjustStockEnvelopeJsonSchema,
  paginatedStockEnvelopeJsonSchema,
  paginatedTransactionsEnvelopeJsonSchema,
} from '../validation/inventory.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function stockRoutes(
  fastify: FastifyInstance,
  controller: StockController
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

  // Adjust stock
  fastify.post(
    '/workspaces/:workspaceId/stock/adjust',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(adjustStockSchema),
        workspaceAuth,
        RolePermissions.MANAGER_LEVEL,
      ],
      schema: {
        tags: ['Inventory - Stock'],
        description: 'Adjust stock levels (IN, OUT, TRANSFER, ADJUSTMENT)',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: adjustStockBodyJsonSchema,
        response: {
          200: adjustStockEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(listStockQuerySchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Inventory - Stock'],
        description: 'Get stock levels',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: listStockQueryJsonSchema,
        response: {
          200: paginatedStockEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(listTransactionsQuerySchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Inventory - Stock'],
        description: 'List inventory transactions',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: listTransactionsQueryJsonSchema,
        response: {
          200: paginatedTransactionsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listTransactions(request as AuthenticatedRequest, reply)
  );
}
