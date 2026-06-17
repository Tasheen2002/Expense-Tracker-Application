import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ScenarioController } from '../controllers/scenario.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
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
  planIdParamsJsonSchema,
  scenarioParamsJsonSchema,
  createScenarioBodyJsonSchema,
  updateScenarioBodyJsonSchema,
  scenarioEnvelopeJsonSchema,
  paginatedScenariosEnvelopeJsonSchema,
} from '../validation/budget-planning.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function scenarioRoutes(
  fastify: FastifyInstance,
  controller: ScenarioController,
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

  // Create scenario
  fastify.post(
    '/workspaces/:workspaceId/budget-plans/:planId/scenarios',
    {
      preValidation: [validateParams(planIdParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(createScenarioSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Budget Planning - Scenarios'],
        description: 'Create a new scenario for a budget plan',
        security: [{ bearerAuth: [] }],
        params: planIdParamsJsonSchema,
        body: createScenarioBodyJsonSchema,
        response: {
          201: scenarioEnvelopeJsonSchema,
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
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Budget Planning - Scenarios'],
        description: 'List all scenarios for a budget plan',
        security: [{ bearerAuth: [] }],
        params: planIdParamsJsonSchema,
        response: {
          200: paginatedScenariosEnvelopeJsonSchema,
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
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Budget Planning - Scenarios'],
        description: 'Get a specific scenario',
        security: [{ bearerAuth: [] }],
        params: scenarioParamsJsonSchema,
        response: {
          200: scenarioEnvelopeJsonSchema,
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
        fastify.authenticate,
        workspaceAuth,
        validateBody(updateScenarioSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Budget Planning - Scenarios'],
        description: 'Update a scenario',
        security: [{ bearerAuth: [] }],
        params: scenarioParamsJsonSchema,
        body: updateScenarioBodyJsonSchema,
        response: {
          200: scenarioEnvelopeJsonSchema,
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
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Budget Planning - Scenarios'],
        description: 'Delete a scenario',
        security: [{ bearerAuth: [] }],
        params: scenarioParamsJsonSchema,
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

