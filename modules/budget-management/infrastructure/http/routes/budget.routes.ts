import { FastifyInstance } from 'fastify';
import { BudgetController } from '../controllers/budget.controller';
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
  createBudgetSchema,
  updateBudgetSchema,
  listBudgetsSchema,
  addAllocationSchema,
  updateAllocationSchema,
  workspaceParamsSchema,
  budgetParamsSchema,
  allocationParamsSchema,
} from '../validation/budget.schema';
import { requireRole } from '../../../../../apps/api/src/shared/middleware/role-authorization.middleware';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function budgetRoutes(
  fastify: FastifyInstance,
  controller: BudgetController
) {
  // Apply write rate limiting to all mutation routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  const budgetSchema = {
    type: 'object',
    properties: {
      budgetId: { type: 'string', format: 'uuid' },
      workspaceId: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
      totalAmount: { type: 'string' },
      currency: { type: 'string' },
      period: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time', nullable: true },
          type: { type: 'string' },
        },
      },
      status: { type: 'string' },
      createdBy: { type: 'string' },
      isRecurring: { type: 'boolean' },
      rolloverUnused: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  };

  const allocationSchema = {
    type: 'object',
    properties: {
      allocationId: { type: 'string', format: 'uuid' },
      budgetId: { type: 'string' },
      categoryId: { type: 'string', nullable: true },
      allocatedAmount: { type: 'string' },
      spentAmount: { type: 'string' },
      description: { type: 'string', nullable: true },
      remainingAmount: { type: 'string' },
      spentPercentage: { type: 'number' },
      isOverBudget: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  };

  const alertSchema = {
    type: 'object',
    properties: {
      alertId: { type: 'string', format: 'uuid' },
      budgetId: { type: 'string' },
      allocationId: { type: 'string', nullable: true },
      type: { type: 'string' },
      threshold: { type: 'number' },
      currentAmount: { type: 'string' },
      message: { type: 'string' },
      isRead: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  };

  // Create budget
  fastify.post(
    '/workspaces/:workspaceId/budgets',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        validateBody(createBudgetSchema),
        requireRole(['owner', 'admin', 'manager']),
      ],
      schema: {
        tags: ['Budget'],
        description: 'Create a new budget',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: [
            'name',
            'totalAmount',
            'currency',
            'periodType',
            'startDate',
          ],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', nullable: true },
            totalAmount: { type: 'number', minimum: 0 },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            periodType: {
              type: 'string',
              enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'],
            },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time', nullable: true },
            isRecurring: { type: 'boolean', default: false },
            rolloverUnused: { type: 'boolean', default: false },
          },
        },
        response: {
          201: {
            description: 'Budget created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: budgetSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.createBudget(request as AuthenticatedRequest, reply)
  );

  // List budgets
  fastify.get(
    '/workspaces/:workspaceId/budgets',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        validateQuery(listBudgetsSchema),
        requireRole(['owner', 'admin', 'manager', 'viewer']),
      ],
      schema: {
        tags: ['Budget'],
        description: 'List all budgets in workspace',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Budgets retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: budgetSchema },
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
      controller.listBudgets(request as AuthenticatedRequest, reply)
  );

  // Get budget by ID
  fastify.get(
    '/workspaces/:workspaceId/budgets/:budgetId',
    {
      preValidation: [validateParams(budgetParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'manager', 'viewer'])],
      schema: {
        tags: ['Budget'],
        description: 'Get budget by ID',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Budget retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: budgetSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getBudget(request as AuthenticatedRequest, reply)
  );

  // Update budget
  fastify.patch(
    '/workspaces/:workspaceId/budgets/:budgetId',
    {
      preValidation: [validateParams(budgetParamsSchema)],
      preHandler: [
        validateBody(updateBudgetSchema),
        requireRole(['owner', 'admin', 'manager']),
      ],
      schema: {
        tags: ['Budget'],
        description: 'Update budget',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', nullable: true },
            totalAmount: { type: 'number', minimum: 0 },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time', nullable: true },
            status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'] },
            isRecurring: { type: 'boolean' },
            rolloverUnused: { type: 'boolean' },
          },
        },
        response: {
          200: {
            description: 'Budget updated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: budgetSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.updateBudget(request as AuthenticatedRequest, reply)
  );

  // Activate budget
  fastify.post(
    '/workspaces/:workspaceId/budgets/:budgetId/activate',
    {
      preValidation: [validateParams(budgetParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'manager'])],
      schema: {
        tags: ['Budget'],
        description: 'Activate budget',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Budget activated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: budgetSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.activateBudget(request as AuthenticatedRequest, reply)
  );

  // Archive budget
  fastify.post(
    '/workspaces/:workspaceId/budgets/:budgetId/archive',
    {
      preValidation: [validateParams(budgetParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'manager'])],
      schema: {
        tags: ['Budget'],
        description: 'Archive budget',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Budget archived successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: budgetSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.archiveBudget(request as AuthenticatedRequest, reply)
  );

  // Delete budget
  fastify.delete(
    '/workspaces/:workspaceId/budgets/:budgetId',
    {
      preValidation: [validateParams(budgetParamsSchema)],
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Budget'],
        description: 'Delete budget',
        security: [{ bearerAuth: [] }],
        response: {
          204: {
            description: 'Budget deleted successfully',
            type: 'null',
          },
        },
      },
    },
    (request, reply) =>
      controller.deleteBudget(request as AuthenticatedRequest, reply)
  );

  // Add allocation
  fastify.post(
    '/workspaces/:workspaceId/budgets/:budgetId/allocations',
    {
      preValidation: [validateParams(budgetParamsSchema)],
      preHandler: [
        validateBody(addAllocationSchema),
        requireRole(['owner', 'admin', 'manager']),
      ],
      schema: {
        tags: ['Budget Allocation'],
        description: 'Add allocation to budget',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['allocatedAmount'],
          properties: {
            categoryId: { type: 'string', format: 'uuid', nullable: true },
            allocatedAmount: { type: 'number', minimum: 0 },
            description: { type: 'string', nullable: true },
          },
        },
        response: {
          201: {
            description: 'Allocation added successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: allocationSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.addAllocation(request as AuthenticatedRequest, reply)
  );

  // Get allocations
  fastify.get(
    '/workspaces/:workspaceId/budgets/:budgetId/allocations',
    {
      preValidation: [validateParams(budgetParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'manager', 'viewer'])],
      schema: {
        tags: ['Budget Allocation'],
        description: 'Get budget allocations',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Allocations retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: allocationSchema },
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
      controller.getAllocations(request as AuthenticatedRequest, reply)
  );

  // Update allocation
  fastify.patch(
    '/workspaces/:workspaceId/budgets/:budgetId/allocations/:allocationId',
    {
      preValidation: [validateParams(allocationParamsSchema)],
      preHandler: [
        validateBody(updateAllocationSchema),
        requireRole(['owner', 'admin', 'manager']),
      ],
      schema: {
        tags: ['Budget Allocation'],
        description: 'Update allocation',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            categoryId: { type: 'string', format: 'uuid', nullable: true },
            allocatedAmount: { type: 'number', minimum: 0 },
            description: { type: 'string', nullable: true },
          },
        },
        response: {
          200: {
            description: 'Allocation updated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: allocationSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.updateAllocation(request as AuthenticatedRequest, reply)
  );

  // Delete allocation
  fastify.delete(
    '/workspaces/:workspaceId/budgets/:budgetId/allocations/:allocationId',
    {
      preValidation: [validateParams(allocationParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'manager'])],
      schema: {
        tags: ['Budget Allocation'],
        description: 'Delete allocation',
        security: [{ bearerAuth: [] }],
        response: {
          204: {
            description: 'Allocation deleted successfully',
            type: 'null',
          },
        },
      },
    },
    (request, reply) =>
      controller.deleteAllocation(request as AuthenticatedRequest, reply)
  );

  // Get unread alerts
  fastify.get(
    '/workspaces/:workspaceId/budgets/alerts/unread',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'manager', 'viewer'])],
      schema: {
        tags: ['Budget Alert'],
        description: 'Get unread budget alerts',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Alerts retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: alertSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getUnreadAlerts(request as AuthenticatedRequest, reply)
  );
}
