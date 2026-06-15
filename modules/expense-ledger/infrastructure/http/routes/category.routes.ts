import { FastifyInstance } from 'fastify';
import { CategoryController } from '../controllers/category.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
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
} from '../validation/category.schema';
import {
  successResponse,
  noContentResponse,
  paginatedResponse,
} from '@shared/http/response-schemas';

const categorySchema = {
  type: 'object',
  properties: {
    categoryId: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    color: { type: 'string', nullable: true },
    icon: { type: 'string', nullable: true },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function categoryRoutes(
  fastify: FastifyInstance,
  controller: CategoryController
) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create category
  fastify.post(
    '/workspaces/:workspaceId/categories',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateBody(createCategorySchema),
      ],
      schema: {
        tags: ['Category'],
        description: 'Create a new category',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createCategoryBodyJsonSchema,
        response: {
          201: successResponse(categorySchema, 201),
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
      preValidation: [
        validateParams(categoryParamsSchema),
        validateBody(updateCategorySchema),
      ],
      schema: {
        tags: ['Category'],
        description: 'Update a category',
        security: [{ bearerAuth: [] }],
        params: categoryParamsJsonSchema,
        body: updateCategoryBodyJsonSchema,
        response: {
          200: successResponse(categorySchema),
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
      preValidation: [validateParams(categoryParamsSchema)],
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
      preValidation: [validateParams(categoryParamsSchema)],
      schema: {
        tags: ['Category'],
        description: 'Get category by ID',
        security: [{ bearerAuth: [] }],
        params: categoryParamsJsonSchema,
        response: {
          200: successResponse(categorySchema),
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
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(listCategoriesQuerySchema),
      ],
      schema: {
        tags: ['Category'],
        description: 'List all categories',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: listCategoriesQueryJsonSchema,
        response: {
          200: successResponse(paginatedResponse(categorySchema)),
        },
      },
    },
    (request, reply) =>
      controller.listCategories(request as AuthenticatedRequest, reply)
  );
}
