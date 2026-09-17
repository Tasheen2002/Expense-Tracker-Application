import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CategoryRuleController } from '../controllers/category-rule.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  validateBody,
  validateQuery,
} from '../validation/validator';
import {
  createRuleSchema,
  updateRuleSchema,
  ruleQuerySchema,
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
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function categoryRuleRoutes(
  fastify: FastifyInstance,
  controller: CategoryRuleController
) {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, request.server.prisma);
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(createRuleSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(ruleQuerySchema),
        workspaceAuth,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(updateRuleSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(executionQuerySchema),
        workspaceAuth,
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
