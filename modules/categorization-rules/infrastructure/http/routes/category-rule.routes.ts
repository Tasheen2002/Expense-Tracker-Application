import { FastifyInstance } from 'fastify';
import { CategoryRuleController } from '../controllers/category-rule.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
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
} from '../validation/categorization-rules.schema';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { requireRole } from '@shared/middleware/role-authorization.middleware';

// Shared Response Schema for Category Rule
const categoryRuleSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    priority: { type: 'integer' },
    condition: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        value: { type: 'string' },
      },
    },
    targetCategoryId: { type: 'string', format: 'uuid' },
    isActive: { type: 'boolean' },
    createdBy: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

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

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function categoryRuleRoutes(
  fastify: FastifyInstance,
  controller: CategoryRuleController
) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create category rule
  fastify.post(
    '/workspaces/:workspaceId/rules',
    {
      preHandler: [
        validateParams(workspaceParamsSchema),
        validateBody(createRuleSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Category Rule'],
        description: 'Create a new category rule',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: [
            'name',
            'conditionType',
            'conditionValue',
            'targetCategoryId',
          ],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', maxLength: 500, nullable: true },
            priority: { type: 'integer', minimum: 0 },
            conditionType: {
              type: 'string',
              enum: [
                'MERCHANT_CONTAINS',
                'MERCHANT_EQUALS',
                'AMOUNT_GREATER_THAN',
                'AMOUNT_LESS_THAN',
                'AMOUNT_EQUALS',
                'DESCRIPTION_CONTAINS',
                'PAYMENT_METHOD_EQUALS',
              ],
            },
            conditionValue: { type: 'string', minLength: 1, maxLength: 255 },
            targetCategoryId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          201: {
            description: 'Category rule created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: categoryRuleSchema,
            },
          },
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
      preHandler: [
        validateParams(workspaceParamsSchema),
        validateQuery(ruleQuerySchema),
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Category Rule'],
        description: 'List all category rules in workspace',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Category rules retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: categoryRuleSchema,
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
      controller.listRules(request as AuthenticatedRequest, reply)
  );

  // Get single category rule
  fastify.get(
    '/workspaces/:workspaceId/rules/:ruleId',
    {
      preHandler: [
        validateParams(ruleParamsSchema),
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Category Rule'],
        description: 'Get category rule by ID',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Category rule retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: categoryRuleSchema,
            },
          },
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
      preHandler: [
        validateParams(ruleParamsSchema),
        validateBody(updateRuleSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Category Rule'],
        description: 'Update category rule',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', maxLength: 500, nullable: true },
            priority: { type: 'integer', minimum: 0 },
            conditionType: { type: 'string' },
            conditionValue: { type: 'string' },
            targetCategoryId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Category rule updated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: categoryRuleSchema,
            },
          },
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
      preHandler: [
        validateParams(ruleParamsSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Category Rule'],
        description: 'Delete category rule',
        security: [{ bearerAuth: [] }],
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
      preHandler: [
        validateParams(ruleParamsSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Category Rule'],
        description: 'Activate category rule',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Category rule activated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: categoryRuleSchema,
            },
          },
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
      preHandler: [
        validateParams(ruleParamsSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Category Rule'],
        description: 'Deactivate category rule',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Category rule deactivated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: categoryRuleSchema,
            },
          },
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
      preHandler: [
        validateParams(ruleParamsSchema),
        validateQuery(executionQuerySchema),
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Category Rule'],
        description: 'Get record of rule executions',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Rule executions retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
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
      controller.getRuleExecutions(request as AuthenticatedRequest, reply)
  );
}
