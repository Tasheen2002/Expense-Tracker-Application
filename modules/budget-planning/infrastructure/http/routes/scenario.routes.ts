import { FastifyInstance } from 'fastify';
import { ScenarioController } from '../controllers/scenario.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { requireRole } from '@shared/middleware/role-authorization.middleware';
import { validateBody, validateParams } from '../validation/validator';
import {
  planIdParamsSchema,
  scenarioParamsSchema,
  createScenarioSchema,
  updateScenarioSchema,
  scenarioResponseSchema,
  paginatedScenariosResponseSchema,
} from '../validation/budget-planning.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function scenarioRoutes(
  fastify: FastifyInstance,
  controller: ScenarioController
) {
  // Apply write rate limiting to all mutation routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create scenario
  fastify.post(
    '/workspaces/:workspaceId/budget-plans/:planId/scenarios',
    {
      preValidation: [validateParams(planIdParamsSchema)],
      preHandler: [
        validateBody(createScenarioSchema),
        requireRole(['owner', 'admin', 'manager']),
      ],
      schema: {
        tags: ['Budget Planning - Scenarios'],
        description: 'Create a new scenario for a budget plan',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'planId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            planId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 3, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            assumptions: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  scenarioId: { type: 'string', format: 'uuid' },
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

  // List scenarios for a plan
  fastify.get(
    '/workspaces/:workspaceId/budget-plans/:planId/scenarios',
    {
      preValidation: [validateParams(planIdParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'manager', 'viewer'])],
      schema: {
        tags: ['Budget Planning - Scenarios'],
        description: 'List all scenarios for a budget plan',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'planId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            planId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: paginatedScenariosResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.list(request as AuthenticatedRequest, reply)
  );

  // Get single scenario
  fastify.get(
    '/workspaces/:workspaceId/scenarios/:id',
    {
      preValidation: [validateParams(scenarioParamsSchema)],
      preHandler: [requireRole(['owner', 'admin', 'manager', 'viewer'])],
      schema: {
        tags: ['Budget Planning - Scenarios'],
        description: 'Get a specific scenario',
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
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: scenarioResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.get(request as AuthenticatedRequest, reply)
  );

  // Update scenario
  fastify.patch(
    '/workspaces/:workspaceId/scenarios/:id',
    {
      preValidation: [validateParams(scenarioParamsSchema)],
      preHandler: [
        validateBody(updateScenarioSchema),
        requireRole(['owner', 'admin', 'manager']),
      ],
      schema: {
        tags: ['Budget Planning - Scenarios'],
        description: 'Update a scenario',
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
            name: { type: 'string', minLength: 3, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            assumptions: { type: 'object' },
          },
        },
        response: {
          200: {
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

  // Delete scenario
  fastify.delete(
    '/workspaces/:workspaceId/scenarios/:id',
    {
      preValidation: [validateParams(scenarioParamsSchema)],
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Budget Planning - Scenarios'],
        description: 'Delete a scenario',
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
            description: 'Scenario deleted successfully',
          },
        },
      },
    },
    (request, reply) =>
      controller.delete(request as AuthenticatedRequest, reply)
  );
}
