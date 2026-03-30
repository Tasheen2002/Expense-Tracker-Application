import { FastifyInstance } from 'fastify';
import { TagController } from '../controllers/tag.controller';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '../../../../../apps/api/src/shared/middleware/rate-limiter.middleware';
import { validateBody } from '../validation/validator';
import { createTagSchema, updateTagSchema } from '../validation/tag.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

const tagDataSchema = {
  type: 'object',
  properties: {
    tagId: { type: 'string' },
    workspaceId: { type: 'string' },
    name: { type: 'string' },
    color: { type: 'string' },
    description: { type: 'string' },
    createdAt: { type: 'string' },
  },
};

export async function tagRoutes(
  fastify: FastifyInstance,
  controller: TagController
) {
  // Apply write rate limiting to all mutation routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create receipt tag
  fastify.post(
    '/:workspaceId/receipt-tags',
    {
      preValidation: [validateBody(createTagSchema)],
      schema: {
        tags: ['Receipt Tag'],
        description: 'Create a new receipt tag',
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
            name: { type: 'string', minLength: 1, maxLength: 50 },
            color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
            description: { type: 'string', maxLength: 255 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: tagDataSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.createTag(request as AuthenticatedRequest, reply)
  );

  // Update receipt tag (PATCH - partial update)
  fastify.patch(
    '/:workspaceId/receipt-tags/:tagId',
    {
      preValidation: [validateBody(updateTagSchema)],
      schema: {
        tags: ['Receipt Tag'],
        description: 'Update a receipt tag',
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
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 50 },
            color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
            description: { type: 'string', maxLength: 255 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: tagDataSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.updateTag(request as AuthenticatedRequest, reply)
  );

  // Delete receipt tag
  fastify.delete(
    '/:workspaceId/receipt-tags/:tagId',
    {
      schema: {
        tags: ['Receipt Tag'],
        description: 'Delete a receipt tag',
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
      controller.deleteTag(request as AuthenticatedRequest, reply)
  );

  // List all receipt tags for a workspace
  fastify.get(
    '/:workspaceId/receipt-tags',
    {
      schema: {
        tags: ['Receipt Tag'],
        description: 'List all receipt tags for a workspace',
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
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
                    items: tagDataSchema,
                  },
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
