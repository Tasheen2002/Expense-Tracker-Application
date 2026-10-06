import { FastifyInstance } from 'fastify';
import { RuleExecutionController } from '../controllers/rule-execution.controller';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
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
  paginatedExecutionsEnvelopeJsonSchema,
} from '../validation/categorization-rules.schema';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';

export async function ruleExecutionRoutes(
  fastify: FastifyInstance,
  controller: RuleExecutionController,
  limits = {
    write: createRateLimiter({ ...RateLimitPresets.writeOperations, keyGenerator: userKeyGenerator }),
    read: createRateLimiter({ ...RateLimitPresets.readOperations, keyGenerator: userKeyGenerator }),
  }
) {
  const { write: writeRateLimiter, read: readRateLimiter } = limits;

  // Evaluate rules for an expense
  fastify.post(
    '/workspaces/:workspaceId/evaluate',
    {
      onRequest: [fastify.authenticate, writeRateLimiter],
      preHandler: [
        validateBody(evaluateRulesSchema),
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
      onRequest: [fastify.authenticate, readRateLimiter],
      preHandler: [validateQuery(executionQuerySchema)],
      schema: {
        tags: ['Rule Execution'],
        description: 'Get execution history for a specific expense',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        querystring: executionQueryJsonSchema,
        response: {
          200: paginatedExecutionsEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate, readRateLimiter],
      preHandler: [
        validateQuery(executionQuerySchema),
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
