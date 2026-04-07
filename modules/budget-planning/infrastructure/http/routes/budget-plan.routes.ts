import { FastifyInstance } from 'fastify';
import { BudgetPlanController } from '../controllers/budget-plan.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
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
  budgetPlanResponseSchema,
  paginatedBudgetPlansResponseSchema,
} from '../validation/budget-planning.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function budgetPlanningRoutes(
  fastify: FastifyInstance,
  controller: BudgetPlanController
) {
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
        validateBody(createBudgetPlanSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Budget Planning - Plans'],
        description: 'Create a new budget plan',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['name', 'periodType', 'startDate', 'endDate'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            periodType: {
              type: 'string',
              enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'],
            },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
        },
        response: {
          201: {
            description: 'Budget plan created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  budgetPlanId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
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
      preHandler: [requireRole(['owner', 'admin', 'member'])],
      schema: {
        tags: ['Budget Planning - Plans'],
        description: 'List all budget plans in workspace',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'],
            },
            limit: { type: 'string', pattern: '^[0-9]+$' },
            offset: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        response: {
          200: {
            description: 'Budget plans retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: paginatedBudgetPlansResponseSchema,
            },
          },
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
      preHandler: [requireRole(['owner', 'admin', 'member'])],
      schema: {
        tags: ['Budget Planning - Plans'],
        description: 'Get a specific budget plan',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'id'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Budget plan retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: budgetPlanResponseSchema,
            },
          },
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
        validateBody(updateBudgetPlanSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Budget Planning - Plans'],
        description: 'Update a budget plan',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'id'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: ['string', 'null'], maxLength: 500 },
          },
        },
        response: {
          200: {
            description: 'Budget plan updated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
            },
          },
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
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Budget Planning - Plans'],
        description: 'Delete a budget plan',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'id'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            id: { type: 'string', format: 'uuid' },
          },
        },
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
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Budget Planning - Plans'],
        description: 'Activate a budget plan',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'id'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Budget plan activated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.activate(request as AuthenticatedRequest, reply)
  );
}
