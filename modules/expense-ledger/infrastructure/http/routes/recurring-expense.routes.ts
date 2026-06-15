import { FastifyInstance } from 'fastify';
import { RecurringExpenseController } from '../controllers/recurring-expense.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import {
  validateBody,
  validateParams,
} from '../validation/validator';
import {
  workspaceParamsSchema,
  workspaceParamsJsonSchema,
} from '../validation/common.schema';
import {
  recurringExpenseParamsSchema,
  recurringExpenseParamsJsonSchema,
  createRecurringExpenseSchema,
  createRecurringExpenseBodyJsonSchema,
  recurringTriggerSchema,
  recurringTriggerBodyJsonSchema,
} from '../validation/recurring-expense.schema';
import {
  successResponse,
} from '@shared/http/response-schemas';

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
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateBody(createRecurringExpenseSchema),
      ],
      schema: {
        tags: ['Recurring Expense'],
        description: 'Create a recurring expense',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createRecurringExpenseBodyJsonSchema,
        response: {
          201: successResponse(recurringExpenseSchema, 201),
        },
      },
    },
    (req, reply) => controller.create(req as AuthenticatedRequest, reply)
  );

  // Pause recurring expense
  fastify.post(
    '/workspaces/:workspaceId/recurring/:id/pause',
    {
      preValidation: [validateParams(recurringExpenseParamsSchema)],
      schema: {
        tags: ['Recurring Expense'],
        description: 'Pause a recurring expense',
        security: [{ bearerAuth: [] }],
        params: recurringExpenseParamsJsonSchema,
        response: {
          200: successResponse(recurringExpenseSchema),
        },
      },
    },
    (req, reply) => controller.pause(req as AuthenticatedRequest, reply)
  );

  // Resume recurring expense
  fastify.post(
    '/workspaces/:workspaceId/recurring/:id/resume',
    {
      preValidation: [validateParams(recurringExpenseParamsSchema)],
      schema: {
        tags: ['Recurring Expense'],
        description: 'Resume a recurring expense',
        security: [{ bearerAuth: [] }],
        params: recurringExpenseParamsJsonSchema,
        response: {
          200: successResponse(recurringExpenseSchema),
        },
      },
    },
    (req, reply) => controller.resume(req as AuthenticatedRequest, reply)
  );

  // Stop recurring expense
  fastify.post(
    '/workspaces/:workspaceId/recurring/:id/stop',
    {
      preValidation: [validateParams(recurringExpenseParamsSchema)],
      schema: {
        tags: ['Recurring Expense'],
        description: 'Stop a recurring expense',
        security: [{ bearerAuth: [] }],
        params: recurringExpenseParamsJsonSchema,
        response: {
          200: successResponse(recurringExpenseSchema),
        },
      },
    },
    (req, reply) => controller.stop(req as AuthenticatedRequest, reply)
  );

  // Internal system trigger — no external access
  fastify.post(
    '/recurring/trigger',
    {
      preValidation: [validateBody(recurringTriggerSchema)],
      schema: {
        tags: ['Recurring Expense'],
        description:
          'System trigger to process due recurring expenses (internal use only)',
        security: [{ bearerAuth: [] }],
        body: recurringTriggerBodyJsonSchema,
        response: {
          200: successResponse({
            type: 'object',
            properties: {
              count: { type: 'number' },
            },
          }),
        },
      },
    },
    (req, reply) => controller.trigger(req as AuthenticatedRequest, reply)
  );
}
