import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ExpenseSplitController } from '../controllers/expense-split.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
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
  workspaceParamsJsonSchema,
  paginationQuerySchema,
  paginationQueryJsonSchema,
} from '../validation/common.schema';
import {
  workspaceExpenseParamsJsonSchema,
} from '../validation/attachment.schema';
import {
  createSplitSchema,
  createSplitBodyJsonSchema,
  recordSettlementPaymentSchema,
  recordSettlementPaymentBodyJsonSchema,
  listSettlementsQuerySchema,
  listSettlementsQueryJsonSchema,
  splitParamsJsonSchema,
  settlementParamsJsonSchema,
  splitEnvelopeJsonSchema,
  paginatedSplitsEnvelopeJsonSchema,
  settlementEnvelopeJsonSchema,
  paginatedSettlementsEnvelopeJsonSchema,
} from '../validation/expense-split.schema';
import { noContentResponse } from '@shared/http/response-schemas';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function expenseSplitRoutes(
  fastify: FastifyInstance,
  controller: ExpenseSplitController,
): Promise<void> {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(
      request as AuthenticatedRequest,
      reply,
      request.server.prisma
    );
  };

  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create split
  fastify.post(
    '/workspaces/:workspaceId/expenses/:expenseId/split',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(createSplitSchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Expense Split'],
        description: 'Create an expense split',
        security: [{ bearerAuth: [] }],
        params: workspaceExpenseParamsJsonSchema,
        body: createSplitBodyJsonSchema,
        response: {
          201: splitEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.createSplit(request as AuthenticatedRequest, reply)
  );

  // Get split by ID
  fastify.get(
    '/workspaces/:workspaceId/splits/:splitId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Expense Split'],
        description: 'Get split by ID',
        security: [{ bearerAuth: [] }],
        params: splitParamsJsonSchema,
        response: {
          200: splitEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getSplit(request as AuthenticatedRequest, reply)
  );

  // Get split by expense ID
  fastify.get(
    '/workspaces/:workspaceId/expenses/:expenseId/split',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Expense Split'],
        description: 'Get split by expense ID',
        security: [{ bearerAuth: [] }],
        params: workspaceExpenseParamsJsonSchema,
        response: {
          200: splitEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getSplitByExpense(request as AuthenticatedRequest, reply)
  );

  // List user's splits
  fastify.get(
    '/workspaces/:workspaceId/splits',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(paginationQuerySchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Expense Split'],
        description: "List user's splits",
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: paginatedSplitsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listUserSplits(request as AuthenticatedRequest, reply)
  );

  // Delete split
  fastify.delete(
    '/workspaces/:workspaceId/splits/:splitId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Expense Split'],
        description: 'Delete split',
        security: [{ bearerAuth: [] }],
        params: splitParamsJsonSchema,
        response: {
          204: noContentResponse,
        },
      },
    },
    (request, reply) =>
      controller.deleteSplit(request as AuthenticatedRequest, reply)
  );

  // Record payment for settlement
  fastify.post(
    '/workspaces/:workspaceId/settlements/:settlementId/payment',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(recordSettlementPaymentSchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Split Settlement'],
        description: 'Record a payment for settlement',
        security: [{ bearerAuth: [] }],
        params: settlementParamsJsonSchema,
        body: recordSettlementPaymentBodyJsonSchema,
        response: {
          200: settlementEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.recordPayment(request as AuthenticatedRequest, reply)
  );

  // List user's settlements
  fastify.get(
    '/workspaces/:workspaceId/settlements',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(listSettlementsQuerySchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Split Settlement'],
        description: "List user's settlements",
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: listSettlementsQueryJsonSchema,
        response: {
          200: paginatedSettlementsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listUserSettlements(request as AuthenticatedRequest, reply)
  );

  // Get settlements for a split
  fastify.get(
    '/workspaces/:workspaceId/splits/:splitId/settlements',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Split Settlement'],
        description: 'Get settlements for a split',
        security: [{ bearerAuth: [] }],
        params: splitParamsJsonSchema,
        response: {
          200: paginatedSettlementsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getSplitSettlements(request as AuthenticatedRequest, reply)
  );
}
