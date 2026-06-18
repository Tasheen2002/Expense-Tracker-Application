import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ExpenseController } from '../controllers/expense.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
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
  expenseParamsSchema,
  expenseParamsJsonSchema,
  paginationQuerySchema,
  paginationQueryJsonSchema,
} from '../validation/common.schema';
import {
  createExpenseSchema,
  createExpenseBodyJsonSchema,
  updateExpenseSchema,
  updateExpenseBodyJsonSchema,
  filterExpensesSchema,
  filterExpensesQueryJsonSchema,
  rejectExpenseBodySchema,
  rejectExpenseBodyJsonSchema,
  expenseEnvelopeJsonSchema,
  paginatedExpensesEnvelopeJsonSchema,
  expenseStatisticsEnvelopeJsonSchema,
} from '../validation/expense.schema';
import { noContentResponse } from '@shared/http/response-schemas';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function expenseRoutes(
  fastify: FastifyInstance,
  controller: ExpenseController,
  prisma: PrismaClient
) {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, prisma);
  };

  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create expense
  fastify.post(
    '/workspaces/:workspaceId/expenses',
    {
      onRequest: [fastify.authenticate],
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateBody(createExpenseSchema),
      ],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Expenses'],
        description: 'Create a new expense',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createExpenseBodyJsonSchema,
        response: {
          201: expenseEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.createExpense(request as AuthenticatedRequest, reply)
  );

  // List expenses
  fastify.get(
    '/workspaces/:workspaceId/expenses',
    {
      onRequest: [fastify.authenticate],
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(paginationQuerySchema),
      ],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Expenses'],
        description: 'List all expenses in a workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: paginatedExpensesEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listExpenses(request as AuthenticatedRequest, reply)
  );

  // Filter expenses
  fastify.get(
    '/workspaces/:workspaceId/expenses/filter',
    {
      onRequest: [fastify.authenticate],
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(filterExpensesSchema),
      ],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Expenses'],
        description: 'Filter expenses based on criteria',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: filterExpensesQueryJsonSchema,
        response: {
          200: paginatedExpensesEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.filterExpenses(request as AuthenticatedRequest, reply)
  );

  // Get expense statistics
  fastify.get(
    '/workspaces/:workspaceId/expenses/statistics',
    {
      onRequest: [fastify.authenticate],
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(paginationQuerySchema),
      ],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Expenses'],
        description: 'Get expense statistics',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: expenseStatisticsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getExpenseStatistics(request as AuthenticatedRequest, reply)
  );

  // Get expense by ID
  fastify.get(
    '/workspaces/:workspaceId/expenses/:expenseId',
    {
      onRequest: [fastify.authenticate],
      preValidation: [validateParams(expenseParamsSchema)],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Expenses'],
        description: 'Get an expense by ID',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        response: {
          200: expenseEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getExpense(request as AuthenticatedRequest, reply)
  );

  // Update expense
  fastify.patch(
    '/workspaces/:workspaceId/expenses/:expenseId',
    {
      onRequest: [fastify.authenticate],
      preValidation: [
        validateParams(expenseParamsSchema),
        validateBody(updateExpenseSchema),
      ],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Expenses'],
        description: 'Update an existing expense',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        body: updateExpenseBodyJsonSchema,
        response: {
          200: expenseEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.updateExpense(request as AuthenticatedRequest, reply)
  );

  // Delete expense
  fastify.delete(
    '/workspaces/:workspaceId/expenses/:expenseId',
    {
      onRequest: [fastify.authenticate],
      preValidation: [validateParams(expenseParamsSchema)],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Expenses'],
        description: 'Delete an expense',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        response: {
          204: noContentResponse,
        },
      },
    },
    (request, reply) =>
      controller.deleteExpense(request as AuthenticatedRequest, reply)
  );

  // Submit expense for approval
  fastify.post(
    '/workspaces/:workspaceId/expenses/:expenseId/submit',
    {
      onRequest: [fastify.authenticate],
      preValidation: [validateParams(expenseParamsSchema)],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Expenses'],
        description: 'Submit an expense for approval',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        response: {
          200: expenseEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.submitExpense(request as AuthenticatedRequest, reply)
  );

  // Approve expense
  fastify.post(
    '/workspaces/:workspaceId/expenses/:expenseId/approve',
    {
      onRequest: [fastify.authenticate],
      preValidation: [validateParams(expenseParamsSchema)],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Expenses'],
        description: 'Approve a submitted expense',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        response: {
          200: expenseEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.approveExpense(request as AuthenticatedRequest, reply)
  );

  // Reject expense
  fastify.post(
    '/workspaces/:workspaceId/expenses/:expenseId/reject',
    {
      onRequest: [fastify.authenticate],
      preValidation: [
        validateParams(expenseParamsSchema),
        validateBody(rejectExpenseBodySchema),
      ],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Expenses'],
        description: 'Reject a submitted expense',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        body: rejectExpenseBodyJsonSchema,
        response: {
          200: expenseEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.rejectExpense(request as AuthenticatedRequest, reply)
  );

  // Reimburse expense
  fastify.post(
    '/workspaces/:workspaceId/expenses/:expenseId/reimburse',
    {
      onRequest: [fastify.authenticate],
      preValidation: [validateParams(expenseParamsSchema)],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Expenses'],
        description: 'Mark an approved expense as reimbursed',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        response: {
          200: expenseEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.reimburseExpense(request as AuthenticatedRequest, reply)
  );
}
