import { FastifyInstance } from 'fastify';
import { ExpenseAllocationController } from '../controllers/expense-allocation.controller';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import {
  validateBody,
} from '../validation/validator';
import {
  allocateExpenseSchema,
  expenseParamsJsonSchema,
  workspaceParamsJsonSchema,
  allocateExpenseBodyJsonSchema,
  expenseAllocationListEnvelopeJsonSchema,
  allocationSummaryEnvelopeJsonSchema,
} from '../validation/cost-allocation.schema';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';

export async function expenseAllocationRoutes(
  fastify: FastifyInstance,
  controller: ExpenseAllocationController,
  writeRateLimiter = createRateLimiter({
    ...RateLimitPresets.writeOperations,
    keyGenerator: userKeyGenerator,
  })
) {
  // Allocate expense to departments/cost centers/projects
  fastify.post(
    '/workspaces/:workspaceId/expenses/:expenseId/allocations',
    {
      onRequest: [fastify.authenticate, writeRateLimiter],
      preHandler: [
        validateBody(allocateExpenseSchema),
      ],
      schema: {
        tags: ['Cost Allocation - Expense Allocations'],
        description: 'Allocate expense to departments, cost centers, or projects',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        body: allocateExpenseBodyJsonSchema,
        response: {
          201: expenseAllocationListEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Cost Allocation - Expense Allocations'],
        description: 'Get all allocations for an expense',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        response: {
          200: expenseAllocationListEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate, writeRateLimiter],
      schema: {
        tags: ['Cost Allocation - Expense Allocations'],
        description: 'Delete all allocations for an expense',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        response: {
          204: {
            type: 'null',
            description: 'No Content',
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
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['Cost Allocation - Expense Allocations'],
        description: 'Get allocation summary statistics for workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        response: {
          200: allocationSummaryEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getAllocationSummary(request as AuthenticatedRequest, reply)
  );
}
