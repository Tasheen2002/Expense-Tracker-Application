import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RuleExecutionController } from '../controllers/rule-execution.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  validateBody,
  validateQuery,
} from '../validation/validator';
import {
  evaluateRulesSchema,
  executionQuerySchema,
  workspaceParamsJsonSchema,
  expenseParamsJsonSchema,
  evaluateRulesBodyJsonSchema,
  executionQueryJsonSchema,
  evaluationEnvelopeJsonSchema,
  executionListEnvelopeJsonSchema,
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

export async function ruleExecutionRoutes(
  fastify: FastifyInstance,
  controller: RuleExecutionController
) {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, request.server.prisma);
  };

  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Evaluate rules for an expense
  fastify.post(
    '/workspaces/:workspaceId/evaluate',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(evaluateRulesSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Rule Execution'],
        description: 'Evaluate categorization rules for an expense',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: evaluateRulesBodyJsonSchema,
        response: {
          200: evaluationEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.evaluateRules(request as AuthenticatedRequest, reply)
  );

  // Get executions by expense
  fastify.get(
    '/workspaces/:workspaceId/executions/expense/:expenseId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Rule Execution'],
        description: 'Get execution history for a specific expense',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        response: {
          200: executionListEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getExecutionsByExpense(request as AuthenticatedRequest, reply)
  );

  // Get executions by workspace
  fastify.get(
    '/workspaces/:workspaceId/executions',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(executionQuerySchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Rule Execution'],
        description: 'Get all rule executions in workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: executionQueryJsonSchema,
        response: {
          200: paginatedExecutionsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getExecutionsByWorkspace(
        request as AuthenticatedRequest,
        reply
      )
  );
}
