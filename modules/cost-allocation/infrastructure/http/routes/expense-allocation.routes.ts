import { FastifyInstance } from 'fastify';
import { ExpenseAllocationController } from '../controllers/expense-allocation.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { requireRole } from '@shared/middleware/role-authorization.middleware';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function expenseAllocationRoutes(
  fastify: FastifyInstance,
  controller: ExpenseAllocationController
) {
  // Apply write rate limiting to all mutation routes
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  const expenseAllocationSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      workspaceId: { type: 'string', format: 'uuid' },
      expenseId: { type: 'string', format: 'uuid' },
      amount: { type: 'string' },
      percentage: { type: 'string', nullable: true },
      departmentId: { type: 'string', nullable: true },
      costCenterId: { type: 'string', nullable: true },
      projectId: { type: 'string', nullable: true },
      notes: { type: 'string', nullable: true },
      createdBy: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  };

  const commandResponseSchema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      statusCode: { type: 'number' },
      message: { type: 'string' },
    },
  };

  // Allocate expense to departments/cost centers/projects
  fastify.post(
    '/workspaces/:workspaceId/expenses/:expenseId/allocations',
    {
      preHandler: [requireRole(['owner', 'admin', 'manager'])],
      schema: {
        tags: ['Cost Allocation - Expense Allocations'],
        description:
          'Allocate expense to departments, cost centers, or projects',
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
          required: ['allocations'],
          properties: {
            allocations: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['amount'],
                properties: {
                  amount: { type: 'number', minimum: 0.01 },
                  percentage: { type: 'number', minimum: 0, maximum: 100 },
                  departmentId: { type: 'string', format: 'uuid' },
                  costCenterId: { type: 'string', format: 'uuid' },
                  projectId: { type: 'string', format: 'uuid' },
                  notes: { type: 'string', maxLength: 500 },
                },
              },
            },
          },
        },
        response: {
          200: {
            description: 'Expense allocated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'array',
                items: expenseAllocationSchema,
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.allocateExpense(request as AuthenticatedRequest, reply)
  );

  // Get expense allocations
  fastify.get(
    '/workspaces/:workspaceId/expenses/:expenseId/allocations',
    {
      preHandler: [requireRole(['owner', 'admin', 'manager', 'viewer'])],
      schema: {
        tags: ['Cost Allocation - Expense Allocations'],
        description: 'Get all allocations for an expense',
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
            description: 'Allocations retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'array',
                items: expenseAllocationSchema,
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getAllocations(request as AuthenticatedRequest, reply)
  );

  // Delete expense allocations
  fastify.delete(
    '/workspaces/:workspaceId/expenses/:expenseId/allocations',
    {
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Cost Allocation - Expense Allocations'],
        description: 'Delete all allocations for an expense',
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
            description: 'Allocations deleted successfully',
            ...commandResponseSchema,
          },
        },
      },
    },
    (request, reply) =>
      controller.deleteAllocations(request as AuthenticatedRequest, reply)
  );

  // Get allocation summary for workspace
  fastify.get(
    '/workspaces/:workspaceId/allocations/summary',
    {
      preHandler: [requireRole(['owner', 'admin', 'manager', 'viewer'])],
      schema: {
        tags: ['Cost Allocation - Expense Allocations'],
        description: 'Get allocation summary statistics for workspace',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Allocation summary retrieved successfully',
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
    (request, reply) =>
      controller.getAllocationSummary(request as AuthenticatedRequest, reply)
  );
}
