import { FastifyInstance } from 'fastify';
import { ExpenseController } from '../controllers/expense.controller';
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
} from '../validation/expense.schema';
import { z } from 'zod';
import {
  successResponse,
  noContentResponse,
  paginatedResponse,
} from '@shared/http/response-schemas';

const rejectBodySchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});
const rejectBodyJsonSchema = {
  type: 'object',
  required: ['reason'],
  properties: {
    reason: { type: 'string', minLength: 1 },
  },
} as const;

/**
 * Shared Expense Schema for Responses
 */
const expenseSchema = {
  type: 'object',
  properties: {
    expenseId: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    description: { type: 'string', nullable: true },
    amount: { type: 'string' },
    currency: { type: 'string' },
    expenseDate: { type: 'string', format: 'date-time' },
    categoryId: { type: 'string', format: 'uuid', nullable: true },
    merchant: { type: 'string', nullable: true },
    paymentMethod: { type: 'string' },
    status: { type: 'string' },
    isReimbursable: { type: 'boolean' },
    receiptUrl: { type: 'string', nullable: true },
    tagIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const expenseStatisticsSchema = {
  type: 'object',
  properties: {
    totalExpense: { type: 'number' },
    currency: { type: 'string' },
    expenseCountByStatus: {
      type: 'object',
      properties: {
        draft: { type: 'number' },
        submitted: { type: 'number' },
        approved: { type: 'number' },
        rejected: { type: 'number' },
        reimbursed: { type: 'number' },
      },
    },
    totalCount: { type: 'number' },
  },
};

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function expenseRoutes(
  fastify: FastifyInstance,
  controller: ExpenseController
) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create expense
  fastify.post(
    '/workspaces/:workspaceId/expenses',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateBody(createExpenseSchema),
      ],
      schema: {
        tags: ['Expenses'],
        description: 'Create a new expense',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createExpenseBodyJsonSchema,
        response: {
          201: successResponse(expenseSchema, 201),
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
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(paginationQuerySchema),
      ],
      schema: {
        tags: ['Expenses'],
        description: 'List all expenses in a workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: successResponse(paginatedResponse(expenseSchema)),
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
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(filterExpensesSchema),
      ],
      schema: {
        tags: ['Expenses'],
        description: 'Filter expenses based on criteria',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: filterExpensesQueryJsonSchema,
        response: {
          200: successResponse(paginatedResponse(expenseSchema)),
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
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(paginationQuerySchema),
      ],
      schema: {
        tags: ['Expenses'],
        description: 'Get expense statistics',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: successResponse(expenseStatisticsSchema),
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
      preValidation: [validateParams(expenseParamsSchema)],
      schema: {
        tags: ['Expenses'],
        description: 'Get an expense by ID',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        response: {
          200: successResponse(expenseSchema),
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
      preValidation: [
        validateParams(expenseParamsSchema),
        validateBody(updateExpenseSchema),
      ],
      schema: {
        tags: ['Expenses'],
        description: 'Update an existing expense',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        body: updateExpenseBodyJsonSchema,
        response: {
          200: successResponse(expenseSchema),
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
      preValidation: [validateParams(expenseParamsSchema)],
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
      preValidation: [validateParams(expenseParamsSchema)],
      schema: {
        tags: ['Expenses'],
        description: 'Submit an expense for approval',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        response: {
          200: successResponse(expenseSchema),
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
      preValidation: [validateParams(expenseParamsSchema)],
      schema: {
        tags: ['Expenses'],
        description: 'Approve a submitted expense',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        response: {
          200: successResponse(expenseSchema),
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
      preValidation: [
        validateParams(expenseParamsSchema),
        validateBody(rejectBodySchema),
      ],
      schema: {
        tags: ['Expenses'],
        description: 'Reject a submitted expense',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        body: rejectBodyJsonSchema,
        response: {
          200: successResponse(expenseSchema),
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
      preValidation: [validateParams(expenseParamsSchema)],
      schema: {
        tags: ['Expenses'],
        description: 'Mark an approved expense as reimbursed',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        response: {
          200: successResponse(expenseSchema),
        },
      },
    },
    (request, reply) =>
      controller.reimburseExpense(request as AuthenticatedRequest, reply)
  );
}
