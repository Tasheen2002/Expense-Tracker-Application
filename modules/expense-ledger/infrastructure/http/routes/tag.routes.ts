import { FastifyInstance } from 'fastify';
import { TagController } from '../controllers/tag.controller';
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
  paginationQuerySchema,
  paginationQueryJsonSchema,
} from '../validation/common.schema';
import {
  tagParamsSchema,
  tagParamsJsonSchema,
  createTagSchema,
  createTagBodyJsonSchema,
  updateTagSchema,
  updateTagBodyJsonSchema,
} from '../validation/tag.schema';
import {
  successResponse,
  noContentResponse,
  paginatedResponse,
} from '@shared/http/response-schemas';

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
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateBody(createTagSchema),
      ],
      schema: {
        tags: ['Tag'],
        description: 'Create a new tag',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createTagBodyJsonSchema,
        response: {
          201: successResponse(tagSchema, 201),
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
      preValidation: [
        validateParams(tagParamsSchema),
        validateBody(updateTagSchema),
      ],
      schema: {
        tags: ['Tag'],
        description: 'Update a tag',
        security: [{ bearerAuth: [] }],
        params: tagParamsJsonSchema,
        body: updateTagBodyJsonSchema,
        response: {
          200: successResponse(tagSchema),
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
      preValidation: [validateParams(tagParamsSchema)],
      schema: {
        tags: ['Tag'],
        description: 'Delete a tag',
        security: [{ bearerAuth: [] }],
        params: tagParamsJsonSchema,
        response: {
          204: noContentResponse,
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
      preValidation: [validateParams(tagParamsSchema)],
      schema: {
        tags: ['Tag'],
        description: 'Get tag by ID',
        security: [{ bearerAuth: [] }],
        params: tagParamsJsonSchema,
        response: {
          200: successResponse(tagSchema),
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
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(paginationQuerySchema),
      ],
      schema: {
        tags: ['Tag'],
        description: 'List all tags',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: successResponse(paginatedResponse(tagSchema)),
        },
      },
    },
    (request, reply) =>
      controller.listTags(request as AuthenticatedRequest, reply)
  );
}
