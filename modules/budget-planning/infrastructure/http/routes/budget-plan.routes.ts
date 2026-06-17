import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { BudgetPlanController } from '../controllers/budget-plan.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { requireRole } from '@shared/middleware/role-authorization.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  workspaceParamsSchema,
  planParamsSchema,
  createBudgetPlanSchema,
  updateBudgetPlanSchema,
  budgetPlanQuerySchema,
  workspaceParamsJsonSchema,
  planParamsJsonSchema,
  createBudgetPlanBodyJsonSchema,
  updateBudgetPlanBodyJsonSchema,
  budgetPlanQueryJsonSchema,
  budgetPlanEnvelopeJsonSchema,
  paginatedBudgetPlansEnvelopeJsonSchema,
  baseResponseEnvelopeJsonSchema,
} from '../validation/budget-planning.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function budgetPlanningRoutes(
  fastify: FastifyInstance,
  controller: BudgetPlanController,
  prisma: PrismaClient
) {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, prisma);
  };

  // Apply write rate limiting to all mutation routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create budget plan
  fastify.post(
    '/workspaces/:workspaceId/budget-plans',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(createBudgetPlanSchema),
        requireRole(['owner', 'admin']),
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
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(budgetPlanQuerySchema),
      ],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin', 'member']),
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
      preValidation: [validateParams(planParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin', 'member']),
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
      preValidation: [validateParams(planParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(updateBudgetPlanSchema),
        requireRole(['owner', 'admin']),
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
      preValidation: [validateParams(planParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
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
      preValidation: [validateParams(planParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
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
}
