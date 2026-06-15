import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { TagController } from '../controllers/tag.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  workspaceParamsSchema,
  tagParamsSchema,
  workspaceParamsJsonSchema,
  tagParamsJsonSchema,
  baseResponseJsonSchema,
} from '../validation/common.schema';
import {
  createTagSchema,
  updateTagSchema,
  paginationQuerySchema,
  createTagBodyJsonSchema,
  updateTagBodyJsonSchema,
  paginationQueryJsonSchema,
  tagEnvelopeJsonSchema,
  tagListEnvelopeJsonSchema,
} from '../validation/tag.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function tagRoutes(
  fastify: FastifyInstance,
  controller: TagController,
  prisma: PrismaClient
): Promise<void> {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, prisma);
  };

  // Apply write rate limiting to all mutation routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // List all receipt tags for a workspace
  fastify.get(
    '/:workspaceId/receipt-tags',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(paginationQuerySchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt Tag'],
        description: 'List all receipt tags for a workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: tagListEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listTags(request as AuthenticatedRequest, reply)
  );

  // Create receipt tag
  fastify.post(
    '/:workspaceId/receipt-tags',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateBody(createTagSchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt Tag'],
        description: 'Create a new receipt tag',
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

  // Update receipt tag (PATCH - partial update)
  fastify.patch(
    '/:workspaceId/receipt-tags/:tagId',
    {
      preValidation: [
        validateParams(tagParamsSchema),
        validateBody(updateTagSchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt Tag'],
        description: 'Update a receipt tag',
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

  // Delete receipt tag
  fastify.delete(
    '/:workspaceId/receipt-tags/:tagId',
    {
      preValidation: [validateParams(tagParamsSchema)],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt Tag'],
        description: 'Delete a receipt tag',
        security: [{ bearerAuth: [] }],
        params: tagParamsJsonSchema,
        response: {
          200: baseResponseJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.deleteTag(request as AuthenticatedRequest, reply)
  );
}
