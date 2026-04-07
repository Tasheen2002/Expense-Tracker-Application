import { FastifyInstance } from 'fastify';
import { TagController } from '../controllers/tag.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { validateBody } from '../validation/validator';
import { createTagSchema, updateTagSchema } from '../validation/tag.schema';

const tagSchema = {
  type: 'object',
  properties: {
    tagId: { type: 'string', format: 'uuid' },
    workspaceId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    color: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function tagRoutes(
  fastify: FastifyInstance,
  controller: TagController
) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create tag
  fastify.post(
    '/workspaces/:workspaceId/tags',
    {
      preValidation: [validateBody(createTagSchema)],
      schema: {
        tags: ['Tag'],
        description: 'Create a new tag',
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
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 50 },
            color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          },
        },
        response: {
          201: {
            description: 'Tag created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: tagSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.createTag(request as AuthenticatedRequest, reply)
  );

  // Update tag
  fastify.patch(
    '/workspaces/:workspaceId/tags/:tagId',
    {
      preValidation: [validateBody(updateTagSchema)],
      schema: {
        tags: ['Tag'],
        description: 'Update a tag',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'tagId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            tagId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 50 },
            color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          },
        },
        response: {
          200: {
            description: 'Tag updated successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: tagSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.updateTag(request as AuthenticatedRequest, reply)
  );

  // Delete tag
  fastify.delete(
    '/workspaces/:workspaceId/tags/:tagId',
    {
      schema: {
        tags: ['Tag'],
        description: 'Delete a tag',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'tagId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            tagId: { type: 'string', format: 'uuid' },
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
      controller.deleteTag(request as AuthenticatedRequest, reply)
  );

  // Get tag by ID
  fastify.get(
    '/workspaces/:workspaceId/tags/:tagId',
    {
      schema: {
        tags: ['Tag'],
        description: 'Get tag by ID',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'tagId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            tagId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Tag retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: tagSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getTag(request as AuthenticatedRequest, reply)
  );

  // List tags
  fastify.get(
    '/workspaces/:workspaceId/tags',
    {
      schema: {
        tags: ['Tag'],
        description: 'List all tags',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Tags retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: tagSchema },
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
      controller.listTags(request as AuthenticatedRequest, reply)
  );
}
