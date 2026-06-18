import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { CategoryController } from '../controllers/category.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  workspaceParamsSchema,
  workspaceParamsJsonSchema,
} from '../validation/common.schema';
import {
  categoryParamsSchema,
  categoryParamsJsonSchema,
  createCategorySchema,
  createCategoryBodyJsonSchema,
  updateCategorySchema,
  updateCategoryBodyJsonSchema,
  listCategoriesQuerySchema,
  listCategoriesQueryJsonSchema,
  categoryEnvelopeJsonSchema,
  paginatedCategoriesEnvelopeJsonSchema,
} from '../validation/category.schema';
import { noContentResponse } from '@shared/http/response-schemas';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function categoryRoutes(
  fastify: FastifyInstance,
  controller: CategoryController,
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

  // Create category
  fastify.post(
    '/workspaces/:workspaceId/categories',
    {
      onRequest: [fastify.authenticate],
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateBody(createCategorySchema),
      ],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Category'],
        description: 'Create a new category',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createCategoryBodyJsonSchema,
        response: {
          201: categoryEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.createCategory(request as AuthenticatedRequest, reply)
  );

  // Update category
  fastify.patch(
    '/workspaces/:workspaceId/categories/:categoryId',
    {
      onRequest: [fastify.authenticate],
      preValidation: [
        validateParams(categoryParamsSchema),
        validateBody(updateCategorySchema),
      ],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Category'],
        description: 'Update a category',
        security: [{ bearerAuth: [] }],
        params: categoryParamsJsonSchema,
        body: updateCategoryBodyJsonSchema,
        response: {
          200: categoryEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.updateCategory(request as AuthenticatedRequest, reply)
  );

  // Delete category
  fastify.delete(
    '/workspaces/:workspaceId/categories/:categoryId',
    {
      onRequest: [fastify.authenticate],
      preValidation: [validateParams(categoryParamsSchema)],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Category'],
        description: 'Delete a category',
        security: [{ bearerAuth: [] }],
        params: categoryParamsJsonSchema,
        response: {
          204: noContentResponse,
        },
      },
    },
    (request, reply) =>
      controller.deleteCategory(request as AuthenticatedRequest, reply)
  );

  // Get category by ID
  fastify.get(
    '/workspaces/:workspaceId/categories/:categoryId',
    {
      onRequest: [fastify.authenticate],
      preValidation: [validateParams(categoryParamsSchema)],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Category'],
        description: 'Get category by ID',
        security: [{ bearerAuth: [] }],
        params: categoryParamsJsonSchema,
        response: {
          200: categoryEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getCategory(request as AuthenticatedRequest, reply)
  );

  // List categories
  fastify.get(
    '/workspaces/:workspaceId/categories',
    {
      onRequest: [fastify.authenticate],
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(listCategoriesQuerySchema),
      ],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Category'],
        description: 'List all categories',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: listCategoriesQueryJsonSchema,
        response: {
          200: paginatedCategoriesEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listCategories(request as AuthenticatedRequest, reply)
  );
}
