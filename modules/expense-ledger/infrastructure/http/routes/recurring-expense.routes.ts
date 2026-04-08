import { FastifyInstance } from 'fastify';
import { RecurringExpenseController } from '../controllers/recurring-expense.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';

const templateSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string', nullable: true },
    amount: { type: 'number' },
    currency: { type: 'string' },
    categoryId: { type: 'string', format: 'uuid', nullable: true },
    merchant: { type: 'string', nullable: true },
    paymentMethod: { type: 'string', nullable: true },
    isReimbursable: { type: 'boolean', nullable: true },
    tagIds: { type: 'array', items: { type: 'string', format: 'uuid' }, nullable: true },
  },
};

const recurringExpenseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    frequency: { type: 'string', enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] },
    interval: { type: 'number' },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time', nullable: true },
    nextRunDate: { type: 'string', format: 'date-time' },
    status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'COMPLETED'] },
    template: templateSchema,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function recurringExpenseRoutes(
  fastify: FastifyInstance,
  controller: RecurringExpenseController
) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create recurring expense
  fastify.post(
    '/workspaces/:workspaceId/recurring',
    {
      schema: {
        tags: ['Recurring Expense'],
        description: 'Create a recurring expense',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['frequency', 'interval', 'startDate', 'template'],
          additionalProperties: false,
          properties: {
            frequency: {
              type: 'string',
              enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'],
            },
            interval: { type: 'integer', minimum: 1 },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            template: {
              type: 'object',
              required: ['title', 'amount', 'currency', 'paymentMethod'],
              additionalProperties: false,
              properties: {
                title: { type: 'string', minLength: 1, maxLength: 255 },
                description: { type: 'string', maxLength: 5000 },
                amount: { type: 'number', minimum: 0.01 },
                currency: { type: 'string', minLength: 3, maxLength: 3 },
                categoryId: { type: 'string', format: 'uuid' },
                merchant: { type: 'string', maxLength: 255 },
                paymentMethod: { type: 'string' },
                isReimbursable: { type: 'boolean' },
              },
            },
          },
        },
        response: {
          201: {
            description: 'Recurring expense created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: recurringExpenseSchema,
            },
          },
        },
      },
    },
    (req, reply) => controller.create(req as AuthenticatedRequest, reply)
  );

  // Pause recurring expense
  fastify.post(
    '/workspaces/:workspaceId/recurring/:id/pause',
    {
      schema: {
        tags: ['Recurring Expense'],
        description: 'Pause a recurring expense',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'id'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Recurring expense paused',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: recurringExpenseSchema,
            },
          },
        },
      },
    },
    (req, reply) => controller.pause(req as AuthenticatedRequest, reply)
  );

  // Resume recurring expense
  fastify.post(
    '/workspaces/:workspaceId/recurring/:id/resume',
    {
      schema: {
        tags: ['Recurring Expense'],
        description: 'Resume a recurring expense',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'id'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Recurring expense resumed',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: recurringExpenseSchema,
            },
          },
        },
      },
    },
    (req, reply) => controller.resume(req as AuthenticatedRequest, reply)
  );

  // Stop recurring expense
  fastify.post(
    '/workspaces/:workspaceId/recurring/:id/stop',
    {
      schema: {
        tags: ['Recurring Expense'],
        description: 'Stop a recurring expense',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'id'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Recurring expense stopped',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: recurringExpenseSchema,
            },
          },
        },
      },
    },
    (req, reply) => controller.stop(req as AuthenticatedRequest, reply)
  );

  // Internal system trigger — no external access
  fastify.post(
    '/recurring/trigger',
    {
      schema: {
        tags: ['Recurring Expense'],
        description:
          'System trigger to process due recurring expenses (internal use only)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            secret: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Recurring expenses processed',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  count: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    (req, reply) => controller.trigger(req as AuthenticatedRequest, reply)
  );
}
