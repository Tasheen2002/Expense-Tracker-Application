import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BudgetPlanController } from '../controllers/budget-plan.controller';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  createBudgetPlanSchema,
  updateBudgetPlanSchema,
  budgetPlanQuerySchema,
  workspaceParamsSchema,
  planParamsSchema,
  workspaceParamsJsonSchema,
  planParamsJsonSchema,
  createBudgetPlanBodyJsonSchema,
  updateBudgetPlanBodyJsonSchema,
  budgetPlanQueryJsonSchema,
  budgetPlanEnvelopeJsonSchema,
  paginatedBudgetPlansEnvelopeJsonSchema,
} from '../validation/budget-planning.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function budgetPlanningRoutes(
  fastify: FastifyInstance,
  controller: BudgetPlanController
) {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, request.server.prisma);
  };

  // Create budget plan
  fastify.post(
    '/workspaces/:workspaceId/budget-plans',
    {
      onRequest: [fastify.authenticate, writeRateLimiter],
      preHandler: [
        validateParams(workspaceParamsSchema),
        validateBody(createBudgetPlanSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Budget Planning - Plans'],
        description: 'Create a new budget plan',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createBudgetPlanBodyJsonSchema,
        response: {
          201: budgetPlanEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.create(request as AuthenticatedRequest, reply)
  );

  // List budget plans
  fastify.get(
    '/workspaces/:workspaceId/budget-plans',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateParams(workspaceParamsSchema),
        validateQuery(budgetPlanQuerySchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Budget Planning - Plans'],
        description: 'List all budget plans in workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: budgetPlanQueryJsonSchema,
        response: {
          200: paginatedBudgetPlansEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.list(request as AuthenticatedRequest, reply)
  );

  // Get single budget plan
  fastify.get(
    '/workspaces/:workspaceId/budget-plans/:id',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateParams(planParamsSchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Budget Planning - Plans'],
        description: 'Get a specific budget plan',
        security: [{ bearerAuth: [] }],
        params: planParamsJsonSchema,
        response: {
          200: budgetPlanEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.get(request as AuthenticatedRequest, reply)
  );

  // Update budget plan
  fastify.patch(
    '/workspaces/:workspaceId/budget-plans/:id',
    {
      onRequest: [fastify.authenticate, writeRateLimiter],
      preHandler: [
        validateParams(planParamsSchema),
        validateBody(updateBudgetPlanSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Budget Planning - Plans'],
        description: 'Update a budget plan',
        security: [{ bearerAuth: [] }],
        params: planParamsJsonSchema,
        body: updateBudgetPlanBodyJsonSchema,
        response: {
          200: budgetPlanEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.update(request as AuthenticatedRequest, reply)
  );

  // Delete budget plan
  fastify.delete(
    '/workspaces/:workspaceId/budget-plans/:id',
    {
      onRequest: [fastify.authenticate, writeRateLimiter],
      preHandler: [
        validateParams(planParamsSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Budget Planning - Plans'],
        description: 'Delete a budget plan',
        security: [{ bearerAuth: [] }],
        params: planParamsJsonSchema,
        response: {
          204: {
            type: 'null',
            description: 'Budget plan deleted successfully',
          },
        },
      },
    },
    (request, reply) =>
      controller.delete(request as AuthenticatedRequest, reply)
  );

  // Activate budget plan
  fastify.patch(
    '/workspaces/:workspaceId/budget-plans/:id/activate',
    {
      onRequest: [fastify.authenticate, writeRateLimiter],
      preHandler: [
        validateParams(planParamsSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Budget Planning - Plans'],
        description: 'Activate a budget plan',
        security: [{ bearerAuth: [] }],
        params: planParamsJsonSchema,
        response: {
          200: budgetPlanEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.activate(request as AuthenticatedRequest, reply)
  );

  // Archive budget plan
  fastify.patch(
    '/workspaces/:workspaceId/budget-plans/:id/archive',
    {
      onRequest: [fastify.authenticate, writeRateLimiter],
      preHandler: [
        validateParams(planParamsSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Budget Planning - Plans'],
        description: 'Archive a budget plan',
        security: [{ bearerAuth: [] }],
        params: planParamsJsonSchema,
        response: {
          200: budgetPlanEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.archive(request as AuthenticatedRequest, reply)
  );
}
