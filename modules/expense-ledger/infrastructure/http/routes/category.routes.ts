import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CategoryController } from '../controllers/category.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import {
  validateBody,
  validateQuery,
} from '../validation/validator';
import {
  workspaceParamsJsonSchema,
} from '../validation/common.schema';
import {
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
): Promise<void> {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(
      request as AuthenticatedRequest,
      reply,
      request.server.prisma
    );
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
      preHandler: [
        validateBody(createCategorySchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
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
      preHandler: [
        validateBody(updateCategorySchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
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
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
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
      preHandler: [
        validateQuery(listCategoriesQuerySchema),
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
