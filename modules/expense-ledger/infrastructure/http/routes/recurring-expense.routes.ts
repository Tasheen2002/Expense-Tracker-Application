import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RecurringExpenseController } from '../controllers/recurring-expense.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import {
  validateBody,
} from '../validation/validator';
import {
  workspaceParamsJsonSchema,
} from '../validation/common.schema';
import {
  recurringExpenseParamsJsonSchema,
  createRecurringExpenseSchema,
  createRecurringExpenseBodyJsonSchema,
  recurringTriggerSchema,
  recurringTriggerBodyJsonSchema,
  recurringExpenseEnvelopeJsonSchema,
  recurringTriggerEnvelopeJsonSchema,
} from '../validation/recurring-expense.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function recurringExpenseRoutes(
  fastify: FastifyInstance,
  controller: RecurringExpenseController,
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

  // Create recurring expense
  fastify.post(
    '/workspaces/:workspaceId/recurring',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(createRecurringExpenseSchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Recurring Expense'],
        description: 'Create a recurring expense',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createRecurringExpenseBodyJsonSchema,
        response: {
          201: recurringExpenseEnvelopeJsonSchema,
        },
      },
    },
    (req, reply) => controller.create(req as AuthenticatedRequest, reply)
  );

  // Pause recurring expense
  fastify.post(
    '/workspaces/:workspaceId/recurring/:id/pause',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Recurring Expense'],
        description: 'Pause a recurring expense',
        security: [{ bearerAuth: [] }],
        params: recurringExpenseParamsJsonSchema,
        response: {
          200: recurringExpenseEnvelopeJsonSchema,
        },
      },
    },
    (req, reply) => controller.pause(req as AuthenticatedRequest, reply)
  );

  // Resume recurring expense
  fastify.post(
    '/workspaces/:workspaceId/recurring/:id/resume',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Recurring Expense'],
        description: 'Resume a recurring expense',
        security: [{ bearerAuth: [] }],
        params: recurringExpenseParamsJsonSchema,
        response: {
          200: recurringExpenseEnvelopeJsonSchema,
        },
      },
    },
    (req, reply) => controller.resume(req as AuthenticatedRequest, reply)
  );

  // Stop recurring expense
  fastify.post(
    '/workspaces/:workspaceId/recurring/:id/stop',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Recurring Expense'],
        description: 'Stop a recurring expense',
        security: [{ bearerAuth: [] }],
        params: recurringExpenseParamsJsonSchema,
        response: {
          200: recurringExpenseEnvelopeJsonSchema,
        },
      },
    },
    (req, reply) => controller.stop(req as AuthenticatedRequest, reply)
  );

  // Internal system trigger — no external access
  fastify.post(
    '/recurring/trigger',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(recurringTriggerSchema),
      ],
      schema: {
        tags: ['Recurring Expense'],
        description:
          'System trigger to process due recurring expenses (internal use only)',
        security: [{ bearerAuth: [] }],
        body: recurringTriggerBodyJsonSchema,
        response: {
          200: recurringTriggerEnvelopeJsonSchema,
        },
      },
    },
    (req, reply) => controller.trigger(req as AuthenticatedRequest, reply)
  );
}
