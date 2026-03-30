import { FastifyInstance } from 'fastify';
import { RuleExecutionController } from '../controllers/rule-execution.controller';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  evaluateRulesSchema,
  executionQuerySchema,
  workspaceParamsSchema,
  expenseParamsSchema,
} from '../validation/categorization-rules.schema';

// Shared Response Schema for Rule Execution
const ruleExecutionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    ruleId: { type: 'string', format: 'uuid' },
    expenseId: { type: 'string', format: 'uuid' },
    appliedCategoryId: { type: 'string', format: 'uuid' },
    executedAt: { type: 'string', format: 'date-time' },
  },
};

export async function ruleExecutionRoutes(
  fastify: FastifyInstance,
  controller: RuleExecutionController
) {
  // Evaluate rules for an expense
  fastify.post(
    '/workspaces/:workspaceId/evaluate',
    {
      preHandler: [
        validateParams(workspaceParamsSchema),
        validateBody(evaluateRulesSchema),
      ],
      schema: {
        tags: ['Rule Execution'],
        description: 'Evaluate categorization rules for an expense',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['expenseId', 'expenseData'],
          properties: {
            expenseId: { type: 'string', format: 'uuid' },
            expenseData: {
              type: 'object',
              required: ['amount'],
              properties: {
                merchant: { type: 'string', nullable: true },
                description: { type: 'string', nullable: true },
                amount: { type: 'number', minimum: 0 },
                paymentMethod: { type: 'string', nullable: true },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  appliedRule: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      name: { type: 'string' },
                      priority: { type: 'integer' },
                    },
                  },
                  suggestedCategoryId: {
                    type: 'string',
                    format: 'uuid',
                    nullable: true,
                  },
                  execution: {
                    type: 'object',
                    nullable: true,
                    properties: ruleExecutionSchema.properties,
                  },
                },
              },
            },
          },
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
      preHandler: [validateParams(expenseParamsSchema)],
      schema: {
        tags: ['Rule Execution'],
        description: 'Get execution history for a specific expense',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'array',
                items: ruleExecutionSchema,
              },
            },
          },
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
      preHandler: [
        validateParams(workspaceParamsSchema),
        validateQuery(executionQuerySchema),
      ],
      schema: {
        tags: ['Rule Execution'],
        description: 'Get all rule executions in workspace',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: ruleExecutionSchema,
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      total: { type: 'integer' },
                      limit: { type: 'integer' },
                      offset: { type: 'integer' },
                      hasMore: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
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
