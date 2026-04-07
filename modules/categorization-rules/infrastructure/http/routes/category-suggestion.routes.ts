import { FastifyInstance } from 'fastify';
import { CategorySuggestionController } from '../controllers/category-suggestion.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  createSuggestionSchema,
  suggestionQuerySchema,
  workspaceParamsSchema,
  suggestionParamsSchema,
  expenseParamsSchema,
} from '../validation/categorization-rules.schema';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { requireRole } from '@shared/middleware/role-authorization.middleware';

// Shared Response Schema for Category Suggestion
const categorySuggestionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
    expenseId: { type: 'string', format: 'uuid' },
    suggestedCategoryId: { type: 'string', format: 'uuid' },
    confidence: { type: 'number' },
    reason: { type: 'string', nullable: true },
    isAccepted: { type: 'boolean', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    respondedAt: { type: 'string', format: 'date-time', nullable: true },
  },
};

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function categorySuggestionRoutes(
  fastify: FastifyInstance,
  controller: CategorySuggestionController
) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create category suggestion
  fastify.post(
    '/workspaces/:workspaceId/suggestions',
    {
      preHandler: [
        validateParams(workspaceParamsSchema),
        validateBody(createSuggestionSchema),
        requireRole(['owner', 'admin', 'manager']),
      ],
      schema: {
        tags: ['Categorization Rules - Suggestions'],
        description: 'Create a new category suggestion',
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
          required: ['expenseId', 'suggestedCategoryId', 'confidence'],
          properties: {
            expenseId: { type: 'string', format: 'uuid' },
            suggestedCategoryId: { type: 'string', format: 'uuid' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            reason: { type: 'string', maxLength: 500 },
          },
        },
        response: {
          201: {
            description: 'Suggestion created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: categorySuggestionSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.createSuggestion(request as AuthenticatedRequest, reply)
  );

  // List category suggestions
  fastify.get(
    '/workspaces/:workspaceId/suggestions',
    {
      preHandler: [
        validateParams(workspaceParamsSchema),
        validateQuery(suggestionQuerySchema),
        requireRole(['owner', 'admin', 'manager', 'viewer']),
      ],
      schema: {
        tags: ['Categorization Rules - Suggestions'],
        description: 'List category suggestions in workspace',
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
            pendingOnly: { type: 'string', enum: ['true', 'false'] },
            limit: { type: 'string', pattern: '^[0-9]+$' },
            offset: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        response: {
          200: {
            description: 'Suggestions retrieved successfully',
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
                    items: categorySuggestionSchema,
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
      controller.listSuggestions(request as AuthenticatedRequest, reply)
  );

  // Get single category suggestion
  fastify.get(
    '/workspaces/:workspaceId/suggestions/:suggestionId',
    {
      preHandler: [
        validateParams(suggestionParamsSchema),
        requireRole(['owner', 'admin', 'manager', 'viewer']),
      ],
      schema: {
        tags: ['Categorization Rules - Suggestions'],
        description: 'Get a specific category suggestion',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'suggestionId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            suggestionId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Suggestion retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: categorySuggestionSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getSuggestionById(request as AuthenticatedRequest, reply)
  );

  // Get suggestions by expense
  fastify.get(
    '/workspaces/:workspaceId/suggestions/expense/:expenseId',
    {
      preHandler: [
        validateParams(expenseParamsSchema),
        requireRole(['owner', 'admin', 'manager', 'viewer']),
      ],
      schema: {
        tags: ['Categorization Rules - Suggestions'],
        description: 'Get category suggestions for a specific expense',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'expenseId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            expenseId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Suggestions for expense retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'array',
                items: categorySuggestionSchema,
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getSuggestionsByExpense(request as AuthenticatedRequest, reply)
  );

  // Accept suggestion
  fastify.patch(
    '/workspaces/:workspaceId/suggestions/:suggestionId/accept',
    {
      preHandler: [
        validateParams(suggestionParamsSchema),
        requireRole(['owner', 'admin', 'manager']),
      ],
      schema: {
        tags: ['Categorization Rules - Suggestions'],
        description: 'Accept a category suggestion',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'suggestionId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            suggestionId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Suggestion accepted successfully',
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
      controller.acceptSuggestion(request as AuthenticatedRequest, reply)
  );

  // Reject suggestion
  fastify.patch(
    '/workspaces/:workspaceId/suggestions/:suggestionId/reject',
    {
      preHandler: [
        validateParams(suggestionParamsSchema),
        requireRole(['owner', 'admin', 'manager']),
      ],
      schema: {
        tags: ['Categorization Rules - Suggestions'],
        description: 'Reject a category suggestion',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'suggestionId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            suggestionId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Suggestion rejected successfully',
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
      controller.rejectSuggestion(request as AuthenticatedRequest, reply)
  );

  // Delete suggestion
  fastify.delete(
    '/workspaces/:workspaceId/suggestions/:suggestionId',
    {
      preHandler: [
        validateParams(suggestionParamsSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Categorization Rules - Suggestions'],
        description: 'Delete a category suggestion',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'suggestionId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            suggestionId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            description: 'No Content',
            type: 'null',
          },
        },
      },
    },
    (request, reply) =>
      controller.deleteSuggestion(request as AuthenticatedRequest, reply)
  );
}
