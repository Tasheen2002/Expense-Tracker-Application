import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BudgetController } from '../controllers/budget.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import {
  validateBody,
  validateQuery,
} from '../validation/validator';
import {
  createBudgetSchema,
  updateBudgetSchema,
  listBudgetsSchema,
  addAllocationSchema,
  updateAllocationSchema,
  workspaceParamsJsonSchema,
  budgetParamsJsonSchema,
  allocationParamsJsonSchema,
  createBudgetBodyJsonSchema,
  updateBudgetBodyJsonSchema,
  addAllocationBodyJsonSchema,
  updateAllocationBodyJsonSchema,
  listBudgetsQueryJsonSchema,
  budgetEnvelopeJsonSchema,
  paginatedBudgetsEnvelopeJsonSchema,
  budgetAllocationEnvelopeJsonSchema,
  paginatedAllocationsEnvelopeJsonSchema,
  paginatedAlertsEnvelopeJsonSchema,
} from '../validation/budget.schema';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function budgetRoutes(
  fastify: FastifyInstance,
  controller: BudgetController
) {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, request.server.prisma);
  };

  // Apply write rate limiting to all mutation routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create budget
  fastify.post(
    '/workspaces/:workspaceId/budgets',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(createBudgetSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Budget'],
        description: 'Create a new budget',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createBudgetBodyJsonSchema,
        response: {
          201: budgetEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(listBudgetsSchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Budget'],
        description: 'List all budgets in workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: listBudgetsQueryJsonSchema,
        response: {
          200: paginatedBudgetsEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Budget'],
        description: 'Get budget by ID',
        security: [{ bearerAuth: [] }],
        params: budgetParamsJsonSchema,
        response: {
          200: budgetEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(updateBudgetSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Budget'],
        description: 'Update budget',
        security: [{ bearerAuth: [] }],
        params: budgetParamsJsonSchema,
        body: updateBudgetBodyJsonSchema,
        response: {
          200: budgetEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Budget'],
        description: 'Activate budget',
        security: [{ bearerAuth: [] }],
        params: budgetParamsJsonSchema,
        response: {
          200: budgetEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Budget'],
        description: 'Archive budget',
        security: [{ bearerAuth: [] }],
        params: budgetParamsJsonSchema,
        response: {
          200: budgetEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Budget'],
        description: 'Delete budget',
        security: [{ bearerAuth: [] }],
        params: budgetParamsJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(addAllocationSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Budget Allocation'],
        description: 'Add allocation to budget',
        security: [{ bearerAuth: [] }],
        params: budgetParamsJsonSchema,
        body: addAllocationBodyJsonSchema,
        response: {
          201: budgetAllocationEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Budget Allocation'],
        description: 'Get budget allocations',
        security: [{ bearerAuth: [] }],
        params: budgetParamsJsonSchema,
        response: {
          200: paginatedAllocationsEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(updateAllocationSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Budget Allocation'],
        description: 'Update allocation',
        security: [{ bearerAuth: [] }],
        params: allocationParamsJsonSchema,
        body: updateAllocationBodyJsonSchema,
        response: {
          200: budgetAllocationEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Budget Allocation'],
        description: 'Delete allocation',
        security: [{ bearerAuth: [] }],
        params: allocationParamsJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Budget Alert'],
        description: 'Get unread budget alerts',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        response: {
          200: paginatedAlertsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getUnreadAlerts(request as AuthenticatedRequest, reply)
  );
}
