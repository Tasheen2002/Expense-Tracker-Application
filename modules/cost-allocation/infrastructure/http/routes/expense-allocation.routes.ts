import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ExpenseAllocationController } from '../controllers/expense-allocation.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  validateBody,
  validateParams,
} from '../validation/validator';
import {
  expenseParamsSchema,
  workspaceParamsSchema,
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
import { requireRole } from '@shared/middleware/role-authorization.middleware';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function expenseAllocationRoutes(
  fastify: FastifyInstance,
  controller: ExpenseAllocationController,
  prisma: PrismaClient
) {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, prisma);
  };

  // Apply write rate limiting to all mutation routes via hooks
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Allocate expense to departments/cost centers/projects
  fastify.post(
    '/workspaces/:workspaceId/expenses/:expenseId/allocations',
    {
      preValidation: [validateParams(expenseParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(allocateExpenseSchema),
        requireRole(['owner', 'admin']),
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
      preValidation: [validateParams(expenseParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin', 'member']),
      ],
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
      preValidation: [validateParams(expenseParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
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
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin', 'member']),
      ],
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
