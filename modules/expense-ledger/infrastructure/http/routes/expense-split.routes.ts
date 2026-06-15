import { FastifyInstance } from 'fastify';
import { ExpenseSplitController } from '../controllers/expense-split.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
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
  workspaceParamsSchema,
  workspaceParamsJsonSchema,
  paginationQuerySchema,
  paginationQueryJsonSchema,
} from '../validation/common.schema';
import {
  workspaceExpenseParamsSchema,
  workspaceExpenseParamsJsonSchema,
} from '../validation/attachment.schema';
import {
  createSplitSchema,
  createSplitBodyJsonSchema,
  recordSettlementPaymentSchema,
  recordSettlementPaymentBodyJsonSchema,
  listSettlementsQuerySchema,
  listSettlementsQueryJsonSchema,
  splitParamsSchema,
  splitParamsJsonSchema,
  settlementParamsSchema,
  settlementParamsJsonSchema,
} from '../validation/expense-split.schema';
import {
  successResponse,
  noContentResponse,
  paginatedResponse,
} from '@shared/http/response-schemas';

const participantSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    shareAmount: { type: 'string' },
    sharePercentage: { type: 'number', nullable: true },
    isPaid: { type: 'boolean' },
    paidAt: { type: 'string', format: 'date-time', nullable: true },
  },
};

const splitSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    expenseId: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
    paidBy: { type: 'string', format: 'uuid' },
    totalAmount: { type: 'string' },
    currency: { type: 'string' },
    splitType: { type: 'string', enum: ['EQUAL', 'EXACT', 'PERCENTAGE'] },
    participants: { type: 'array', items: participantSchema },
    isFullySettled: { type: 'boolean' },
    outstandingAmount: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const settlementSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    splitId: { type: 'string', format: 'uuid' },
    fromUserId: { type: 'string', format: 'uuid' },
    toUserId: { type: 'string', format: 'uuid' },
    totalOwedAmount: { type: 'string' },
    paidAmount: { type: 'string' },
    remainingAmount: { type: 'string' },
    currency: { type: 'string' },
    status: { type: 'string', enum: ['PENDING', 'PARTIAL', 'SETTLED'] },
    settledAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function expenseSplitRoutes(
  fastify: FastifyInstance,
  controller: ExpenseSplitController
) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create split
  fastify.post(
    '/workspaces/:workspaceId/expenses/:expenseId/split',
    {
      preValidation: [
        validateParams(workspaceExpenseParamsSchema),
        validateBody(createSplitSchema),
      ],
      schema: {
        tags: ['Expense Split'],
        description: 'Create an expense split',
        security: [{ bearerAuth: [] }],
        params: workspaceExpenseParamsJsonSchema,
        body: createSplitBodyJsonSchema,
        response: {
          201: successResponse(splitSchema, 201),
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
      preValidation: [validateParams(splitParamsSchema)],
      schema: {
        tags: ['Expense Split'],
        description: 'Get split by ID',
        security: [{ bearerAuth: [] }],
        params: splitParamsJsonSchema,
        response: {
          200: successResponse(splitSchema),
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
      preValidation: [validateParams(workspaceExpenseParamsSchema)],
      schema: {
        tags: ['Expense Split'],
        description: 'Get split by expense ID',
        security: [{ bearerAuth: [] }],
        params: workspaceExpenseParamsJsonSchema,
        response: {
          200: successResponse(splitSchema),
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
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(paginationQuerySchema),
      ],
      schema: {
        tags: ['Expense Split'],
        description: "List user's splits",
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: successResponse(paginatedResponse(splitSchema)),
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
      preValidation: [validateParams(splitParamsSchema)],
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
      preValidation: [
        validateParams(settlementParamsSchema),
        validateBody(recordSettlementPaymentSchema),
      ],
      schema: {
        tags: ['Split Settlement'],
        description: 'Record a payment for settlement',
        security: [{ bearerAuth: [] }],
        params: settlementParamsJsonSchema,
        body: recordSettlementPaymentBodyJsonSchema,
        response: {
          200: successResponse(settlementSchema),
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
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(listSettlementsQuerySchema),
      ],
      schema: {
        tags: ['Split Settlement'],
        description: "List user's settlements",
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: listSettlementsQueryJsonSchema,
        response: {
          200: successResponse(paginatedResponse(settlementSchema)),
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
      preValidation: [validateParams(splitParamsSchema)],
      schema: {
        tags: ['Split Settlement'],
        description: 'Get settlements for a split',
        security: [{ bearerAuth: [] }],
        params: splitParamsJsonSchema,
        response: {
          200: successResponse(paginatedResponse(settlementSchema)),
        },
      },
    },
    (request, reply) =>
      controller.getSplitSettlements(request as AuthenticatedRequest, reply)
  );
}
