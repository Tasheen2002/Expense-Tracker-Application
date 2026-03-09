import { FastifyInstance } from 'fastify';
import { RecurringExpenseController } from '../controllers/recurring-expense.controller';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '../../../../../apps/api/src/shared/middleware/rate-limiter.middleware';

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

  fastify.post(
    '/workspaces/:workspaceId/recurring',
    {
      schema: {
        tags: ['Recurring Expense'],
        description: 'Create a recurring expense',
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
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    (req, reply) => controller.create(req as AuthenticatedRequest, reply)
  );

  fastify.post(
    '/recurring/:id/pause',
    {
      schema: {
        tags: ['Recurring Expense'],
        description: 'Pause a recurring expense',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (req, reply) => controller.pause(req as AuthenticatedRequest, reply)
  );

  fastify.post(
    '/recurring/:id/resume',
    {
      schema: {
        tags: ['Recurring Expense'],
        description: 'Resume a recurring expense',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (req, reply) => controller.resume(req as AuthenticatedRequest, reply)
  );

  fastify.post(
    '/recurring/:id/stop',
    {
      schema: {
        tags: ['Recurring Expense'],
        description: 'Stop a recurring expense',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
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
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            secret: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (req, reply) => controller.trigger(req as AuthenticatedRequest, reply)
  );
}
