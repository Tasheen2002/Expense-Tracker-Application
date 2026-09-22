import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TagController } from '../controllers/tag.controller';
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
  paginationQuerySchema,
  paginationQueryJsonSchema,
} from '../validation/common.schema';
import {
  tagParamsJsonSchema,
  createTagSchema,
  createTagBodyJsonSchema,
  updateTagSchema,
  updateTagBodyJsonSchema,
  tagEnvelopeJsonSchema,
  paginatedTagsEnvelopeJsonSchema,
} from '../validation/tag.schema';
import { noContentResponse } from '@shared/http/response-schemas';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function tagRoutes(
  fastify: FastifyInstance,
  controller: TagController,
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

  // Create tag
  fastify.post(
    '/workspaces/:workspaceId/tags',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(createTagSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Tag'],
        description: 'Create a new tag',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createTagBodyJsonSchema,
        response: {
          201: tagEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(updateTagSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Tag'],
        description: 'Update a tag',
        security: [{ bearerAuth: [] }],
        params: tagParamsJsonSchema,
        body: updateTagBodyJsonSchema,
        response: {
          200: tagEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Tag'],
        description: 'Get tag by ID',
        security: [{ bearerAuth: [] }],
        params: tagParamsJsonSchema,
        response: {
          200: tagEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(paginationQuerySchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Tag'],
        description: 'List all tags',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: paginatedTagsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listTags(request as AuthenticatedRequest, reply)
  );
}
