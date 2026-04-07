import { FastifyInstance } from 'fastify';
import { ExpenseSplitController } from '../controllers/expense-split.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';

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
      schema: {
        tags: ['Expense Split'],
        description: 'Create an expense split',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'expenseId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            expenseId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['splitType', 'participants'],
          additionalProperties: false,
          properties: {
            splitType: {
              type: 'string',
              enum: ['EQUAL', 'EXACT', 'PERCENTAGE'],
            },
            participants: {
              type: 'array',
              minItems: 2,
              items: {
                type: 'object',
                required: ['userId'],
                additionalProperties: false,
                properties: {
                  userId: { type: 'string', format: 'uuid' },
                  shareAmount: { type: 'number', minimum: 0.01 },
                  sharePercentage: {
                    type: 'number',
                    minimum: 0,
                    maximum: 100,
                  },
                },
              },
            },
          },
        },
        response: {
          201: {
            description: 'Split created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: splitSchema,
            },
          },
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
      schema: {
        tags: ['Expense Split'],
        description: 'Get split by ID',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'splitId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            splitId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Split retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: splitSchema,
            },
          },
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
      schema: {
        tags: ['Expense Split'],
        description: 'Get split by expense ID',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'expenseId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            expenseId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Split retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: splitSchema,
            },
          },
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
      schema: {
        tags: ['Expense Split'],
        description: "List user's splits",
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'string' },
            offset: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Splits retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: splitSchema },
                  pagination: {
                    type: 'object',
                    properties: {
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
      },
    },
    (request, reply) =>
      controller.listUserSplits(request as AuthenticatedRequest, reply)
  );

  // Delete split
  fastify.delete(
    '/workspaces/:workspaceId/splits/:splitId',
    {
      schema: {
        tags: ['Expense Split'],
        description: 'Delete split',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'splitId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            splitId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            description: 'No Content',
            type: 'null',
          },
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
      schema: {
        tags: ['Split Settlement'],
        description: 'Record a payment for settlement',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'settlementId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            settlementId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['amount'],
          additionalProperties: false,
          properties: {
            amount: { type: 'number', minimum: 0.01 },
          },
        },
        response: {
          200: {
            description: 'Payment recorded successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: settlementSchema,
            },
          },
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
      schema: {
        tags: ['Split Settlement'],
        description: "List user's settlements",
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['PENDING', 'PARTIAL', 'SETTLED'],
            },
            limit: { type: 'string' },
            offset: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Settlements retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: settlementSchema },
                  pagination: {
                    type: 'object',
                    properties: {
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
      },
    },
    (request, reply) =>
      controller.listUserSettlements(request as AuthenticatedRequest, reply)
  );

  // Get settlements for a split
  fastify.get(
    '/workspaces/:workspaceId/splits/:splitId/settlements',
    {
      schema: {
        tags: ['Split Settlement'],
        description: 'Get settlements for a split',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'splitId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            splitId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Split settlements retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: settlementSchema },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getSplitSettlements(request as AuthenticatedRequest, reply)
  );
}
