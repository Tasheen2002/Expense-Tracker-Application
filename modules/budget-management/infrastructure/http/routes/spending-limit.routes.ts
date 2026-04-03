import { FastifyInstance } from 'fastify';
import { SpendingLimitController } from '../controllers/spending-limit.controller';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '../../../../../apps/api/src/shared/middleware/rate-limiter.middleware';
import { validateBody } from '../validation/validator';
import {
  createSpendingLimitSchema,
  updateSpendingLimitSchema,
} from '../validation/spending-limit.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

const spendingLimitDataSchema = {
  type: 'object',
  properties: {
    limitId: { type: 'string' },
    workspaceId: { type: 'string' },
    userId: { type: 'string' },
    categoryId: { type: 'string' },
    limitAmount: { type: 'string' },
    currency: { type: 'string' },
    periodType: { type: 'string' },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};

const singleResponse = (statusCode: number, dataSchema?: object) => ({
  [statusCode]: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      statusCode: { type: 'number' },
      message: { type: 'string' },
      ...(dataSchema ? { data: dataSchema } : {}),
    },
  },
});

export async function spendingLimitRoutes(
  fastify: FastifyInstance,
  controller: SpendingLimitController
) {
  // Apply write rate limiting to all mutation routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });
  // Create spending limit
  fastify.post(
    '/:workspaceId/spending-limits',
    {
      preValidation: [validateBody(createSpendingLimitSchema)],
      schema: {
        tags: ['Spending Limit'],
        description: 'Create a new spending limit',
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['limitAmount', 'currency', 'periodType'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            categoryId: { type: 'string', format: 'uuid' },
            limitAmount: { type: 'number', minimum: 0.01 },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            periodType: {
              type: 'string',
              enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'],
            },
          },
        },
        response: singleResponse(201, spendingLimitDataSchema),
      },
    },
    (request, reply) =>
      controller.createLimit(request as AuthenticatedRequest, reply)
  );

  // List spending limits
  fastify.get(
    '/:workspaceId/spending-limits',
    {
      schema: {
        tags: ['Spending Limit'],
        description: 'List all spending limits in workspace',
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
            userId: { type: 'string', format: 'uuid' },
            categoryId: { type: 'string', format: 'uuid' },
            isActive: { type: 'string', enum: ['true', 'false'] },
            periodType: {
              type: 'string',
              enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'],
            },
            limit: { type: 'string', pattern: '^[0-9]+$' },
            offset: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: spendingLimitDataSchema },
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
      controller.listLimits(request as AuthenticatedRequest, reply)
  );

  // Get spending limit by ID
  fastify.get(
    '/:workspaceId/spending-limits/:limitId',
    {
      schema: {
        tags: ['Spending Limit'],
        description: 'Get spending limit by ID',
        params: {
          type: 'object',
          required: ['workspaceId', 'limitId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            limitId: { type: 'string', format: 'uuid' },
          },
        },
        response: singleResponse(200, spendingLimitDataSchema),
      },
    },
    (request, reply) =>
      controller.getLimit(request as AuthenticatedRequest, reply)
  );

  // Update spending limit
  fastify.patch(
    '/:workspaceId/spending-limits/:limitId',
    {
      preValidation: [validateBody(updateSpendingLimitSchema)],
      schema: {
        tags: ['Spending Limit'],
        description: 'Update spending limit',
        params: {
          type: 'object',
          required: ['workspaceId', 'limitId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            limitId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            limitAmount: { type: 'number', minimum: 0.01 },
          },
        },
        response: singleResponse(200, spendingLimitDataSchema),
      },
    },
    (request, reply) =>
      controller.updateLimit(request as AuthenticatedRequest, reply)
  );

  // Delete spending limit
  fastify.delete(
    '/:workspaceId/spending-limits/:limitId',
    {
      schema: {
        tags: ['Spending Limit'],
        description: 'Delete spending limit',
        params: {
          type: 'object',
          required: ['workspaceId', 'limitId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            limitId: { type: 'string', format: 'uuid' },
          },
        },
        response: singleResponse(200),
      },
    },
    (request, reply) =>
      controller.deleteSpendingLimit(request as AuthenticatedRequest, reply)
  );
}
