import { FastifyInstance } from 'fastify';
import { CategoryController } from '../controllers/category.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';

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
      schema: {
        tags: ['Category'],
        description: 'Create a new category',
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
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            color: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
            icon: { type: 'string', maxLength: 50 },
          },
        },
        response: {
          201: {
            description: 'Category created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: categorySchema,
            },
          },
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
      schema: {
        tags: ['Category'],
        description: 'Update a category',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'categoryId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            categoryId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            color: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
            icon: { type: 'string', maxLength: 50 },
          },
        },
        response: {
          200: {
            description: 'Category updated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: categorySchema,
            },
          },
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
      schema: {
        tags: ['Category'],
        description: 'Delete a category',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'categoryId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            categoryId: { type: 'string', format: 'uuid' },
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
      controller.deleteCategory(request as AuthenticatedRequest, reply)
  );

  // Get category by ID
  fastify.get(
    '/workspaces/:workspaceId/categories/:categoryId',
    {
      schema: {
        tags: ['Category'],
        description: 'Get category by ID',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'categoryId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            categoryId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Category retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: categorySchema,
            },
          },
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
      schema: {
        tags: ['Category'],
        description: 'List all categories',
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
            activeOnly: { type: 'string', enum: ['true', 'false'] },
          },
        },
        response: {
          200: {
            description: 'Categories retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: categorySchema },
                  pagination: {
                    type: 'object',
                    properties: {
                      total: { type: 'number' },
                      limit: { type: 'number' },
                      offset: { type: 'number' },
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
      controller.listCategories(request as AuthenticatedRequest, reply)
  );
}
