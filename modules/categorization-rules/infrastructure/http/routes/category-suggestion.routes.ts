import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { CategorySuggestionController } from '../controllers/category-suggestion.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
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
  workspaceParamsJsonSchema,
  suggestionParamsJsonSchema,
  expenseParamsJsonSchema,
  createSuggestionBodyJsonSchema,
  suggestionQueryJsonSchema,
  suggestionEnvelopeJsonSchema,
  paginatedSuggestionsEnvelopeJsonSchema,
  suggestionListEnvelopeJsonSchema,
  baseResponseEnvelopeJsonSchema,
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

export async function categorySuggestionRoutes(
  fastify: FastifyInstance,
  controller: CategorySuggestionController,
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

  // Create category suggestion
  fastify.post(
    '/workspaces/:workspaceId/suggestions',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(createSuggestionSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Categorization Rules - Suggestions'],
        description: 'Create a new category suggestion',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createSuggestionBodyJsonSchema,
        response: {
          201: suggestionEnvelopeJsonSchema,
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
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateQuery(suggestionQuerySchema),
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Categorization Rules - Suggestions'],
        description: 'List category suggestions in workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: suggestionQueryJsonSchema,
        response: {
          200: paginatedSuggestionsEnvelopeJsonSchema,
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
      preValidation: [validateParams(suggestionParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Categorization Rules - Suggestions'],
        description: 'Get a specific category suggestion',
        security: [{ bearerAuth: [] }],
        params: suggestionParamsJsonSchema,
        response: {
          200: suggestionEnvelopeJsonSchema,
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
      preValidation: [validateParams(expenseParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Categorization Rules - Suggestions'],
        description: 'Get category suggestions for a specific expense',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        response: {
          200: suggestionListEnvelopeJsonSchema,
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
      preValidation: [validateParams(suggestionParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Categorization Rules - Suggestions'],
        description: 'Accept a category suggestion',
        security: [{ bearerAuth: [] }],
        params: suggestionParamsJsonSchema,
        response: {
          200: baseResponseEnvelopeJsonSchema,
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
      preValidation: [validateParams(suggestionParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Categorization Rules - Suggestions'],
        description: 'Reject a category suggestion',
        security: [{ bearerAuth: [] }],
        params: suggestionParamsJsonSchema,
        response: {
          200: baseResponseEnvelopeJsonSchema,
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
      preValidation: [validateParams(suggestionParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Categorization Rules - Suggestions'],
        description: 'Delete a category suggestion',
        security: [{ bearerAuth: [] }],
        params: suggestionParamsJsonSchema,
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
