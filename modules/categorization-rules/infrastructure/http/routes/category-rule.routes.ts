import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { CategoryRuleController } from '../controllers/category-rule.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  createRuleSchema,
  updateRuleSchema,
  ruleQuerySchema,
  workspaceParamsSchema,
  ruleParamsSchema,
  executionQuerySchema,
  workspaceParamsJsonSchema,
  ruleParamsJsonSchema,
  createRuleBodyJsonSchema,
  updateRuleBodyJsonSchema,
  ruleQueryJsonSchema,
  executionQueryJsonSchema,
  ruleEnvelopeJsonSchema,
  paginatedRulesEnvelopeJsonSchema,
  paginatedExecutionsEnvelopeJsonSchema,
} from '../validation/categorization-rules.schema';
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

export async function categoryRuleRoutes(
  fastify: FastifyInstance,
  controller: CategoryRuleController,
  prisma: PrismaClient
) {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, prisma);
  };

  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create category rule
  fastify.post(
    '/workspaces/:workspaceId/rules',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(createRuleSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Category Rule'],
        description: 'Create a new category rule',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createRuleBodyJsonSchema,
        response: {
          201: ruleEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.createRule(request as AuthenticatedRequest, reply)
  );

  // List category rules
  fastify.get(
    '/workspaces/:workspaceId/rules',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateQuery(ruleQuerySchema),
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Category Rule'],
        description: 'List all category rules in workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: ruleQueryJsonSchema,
        response: {
          200: paginatedRulesEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listRules(request as AuthenticatedRequest, reply)
  );

  // Get single category rule
  fastify.get(
    '/workspaces/:workspaceId/rules/:ruleId',
    {
      preValidation: [validateParams(ruleParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Category Rule'],
        description: 'Get category rule by ID',
        security: [{ bearerAuth: [] }],
        params: ruleParamsJsonSchema,
        response: {
          200: ruleEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getRuleById(request as AuthenticatedRequest, reply)
  );

  // Update category rule
  fastify.patch(
    '/workspaces/:workspaceId/rules/:ruleId',
    {
      preValidation: [validateParams(ruleParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(updateRuleSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Category Rule'],
        description: 'Update category rule',
        security: [{ bearerAuth: [] }],
        params: ruleParamsJsonSchema,
        body: updateRuleBodyJsonSchema,
        response: {
          200: ruleEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.updateRule(request as AuthenticatedRequest, reply)
  );

  // Delete category rule
  fastify.delete(
    '/workspaces/:workspaceId/rules/:ruleId',
    {
      preValidation: [validateParams(ruleParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Category Rule'],
        description: 'Delete category rule',
        security: [{ bearerAuth: [] }],
        params: ruleParamsJsonSchema,
        response: {
          204: {
            type: 'null',
            description: 'No Content',
          },
        },
      },
    },
    (request, reply) =>
      controller.deleteRule(request as AuthenticatedRequest, reply)
  );

  // Activate category rule
  fastify.patch(
    '/workspaces/:workspaceId/rules/:ruleId/activate',
    {
      preValidation: [validateParams(ruleParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Category Rule'],
        description: 'Activate category rule',
        security: [{ bearerAuth: [] }],
        params: ruleParamsJsonSchema,
        response: {
          200: ruleEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.activateRule(request as AuthenticatedRequest, reply)
  );

  // Deactivate category rule
  fastify.patch(
    '/workspaces/:workspaceId/rules/:ruleId/deactivate',
    {
      preValidation: [validateParams(ruleParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Category Rule'],
        description: 'Deactivate category rule',
        security: [{ bearerAuth: [] }],
        params: ruleParamsJsonSchema,
        response: {
          200: ruleEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.deactivateRule(request as AuthenticatedRequest, reply)
  );

  // Get rule executions
  fastify.get(
    '/workspaces/:workspaceId/rules/:ruleId/executions',
    {
      preValidation: [validateParams(ruleParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateQuery(executionQuerySchema),
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Category Rule'],
        description: 'Get record of rule executions',
        security: [{ bearerAuth: [] }],
        params: ruleParamsJsonSchema,
        querystring: executionQueryJsonSchema,
        response: {
          200: paginatedExecutionsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getRuleExecutions(request as AuthenticatedRequest, reply)
  );
}
