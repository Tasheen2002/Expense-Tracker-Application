import { FastifyInstance } from 'fastify';
import { ExpenseController } from '../controllers/expense.controller';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '../../../../../apps/api/src/shared/middleware/rate-limiter.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  workspaceParamsSchema,
  expenseParamsSchema,
  paginationQuerySchema,
} from '../validation/common.schema';
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseFilterQuerySchema,
  expenseStatisticsQuerySchema,
} from '../validation/expense.schema';
import { z } from 'zod';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

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
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [validateBody(createExpenseSchema)],
      schema: {
        tags: ['Expenses'],
        description: 'Create a new expense',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['title', 'amount', 'currency', 'expenseDate'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', maxLength: 1000, nullable: true },
            amount: { type: 'number' },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            expenseDate: { type: 'string', format: 'date-time' },
            categoryId: { type: 'string', format: 'uuid', nullable: true },
            merchant: { type: 'string', maxLength: 255, nullable: true },
            paymentMethod: { type: 'string' },
            isReimbursable: { type: 'boolean' },
            tagIds: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
            },
          },
        },
        response: {
          201: {
            description: 'Expense created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: expenseSchema,
            },
          },
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
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [validateQuery(paginationQuerySchema)],
      schema: {
        tags: ['Expenses'],
        description: 'List all expenses in a workspace',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Expenses retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: expenseSchema },
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
      controller.listExpenses(request as AuthenticatedRequest, reply)
  );

  // Filter expenses
  fastify.get(
    '/workspaces/:workspaceId/expenses/filter',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [validateQuery(expenseFilterQuerySchema)],
      schema: {
        tags: ['Expenses'],
        description: 'Filter expenses based on criteria',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Filtered expenses retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: expenseSchema },
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
      controller.filterExpenses(request as AuthenticatedRequest, reply)
  );

  // Get expense statistics
  fastify.get(
    '/workspaces/:workspaceId/expenses/statistics',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [validateQuery(expenseStatisticsQuerySchema)],
      schema: {
        tags: ['Expenses'],
        description: 'Get expense statistics',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Statistics retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: expenseStatisticsSchema,
            },
          },
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
        response: {
          200: {
            description: 'Expense retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: expenseSchema,
            },
          },
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
      preValidation: [validateParams(expenseParamsSchema)],
      preHandler: [validateBody(updateExpenseSchema)],
      schema: {
        tags: ['Expenses'],
        description: 'Update an existing expense',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', maxLength: 1000, nullable: true },
            amount: { type: 'number' },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            expenseDate: { type: 'string', format: 'date-time' },
            categoryId: { type: 'string', format: 'uuid', nullable: true },
            merchant: { type: 'string', maxLength: 255, nullable: true },
            paymentMethod: { type: 'string' },
            isReimbursable: { type: 'boolean' },
            tagIds: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
            },
          },
        },
        response: {
          200: {
            description: 'Expense updated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: expenseSchema,
            },
          },
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
        response: {
          204: {
            description: 'Expense deleted successfully',
            type: 'null',
          },
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
        response: {
          200: {
            description: 'Expense submitted successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: expenseSchema,
            },
          },
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
        response: {
          200: {
            description: 'Expense approved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: expenseSchema,
            },
          },
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
      preValidation: [validateParams(expenseParamsSchema)],
      preHandler: [validateBody(z.object({ reason: z.string().min(1) }))],
      schema: {
        tags: ['Expenses'],
        description: 'Reject a submitted expense',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['reason'],
          properties: {
            reason: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            description: 'Expense rejected successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: expenseSchema,
            },
          },
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
        response: {
          200: {
            description: 'Expense marked as reimbursed successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: expenseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.reimburseExpense(request as AuthenticatedRequest, reply)
  );
}
