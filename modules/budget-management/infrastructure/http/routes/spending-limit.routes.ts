import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SpendingLimitController } from '../controllers/spending-limit.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
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
  createSpendingLimitSchema,
  updateSpendingLimitSchema,
  listSpendingLimitsSchema,
  spendingLimitWorkspaceParamsJsonSchema,
  spendingLimitParamsJsonSchema,
  createSpendingLimitBodyJsonSchema,
  updateSpendingLimitBodyJsonSchema,
  listSpendingLimitsQueryJsonSchema,
  spendingLimitEnvelopeJsonSchema,
  paginatedSpendingLimitsEnvelopeJsonSchema,
} from '../validation/spending-limit.schema';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function spendingLimitRoutes(
  fastify: FastifyInstance,
  controller: SpendingLimitController
) {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, request.server.prisma);
  };

  // Apply write rate limiting to all mutation routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create spending limit
  fastify.post(
    '/workspaces/:workspaceId/spending-limits',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(createSpendingLimitSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Spending Limit'],
        description: 'Create a new spending limit',
        security: [{ bearerAuth: [] }],
        params: spendingLimitWorkspaceParamsJsonSchema,
        body: createSpendingLimitBodyJsonSchema,
        response: {
          201: spendingLimitEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.createLimit(request as AuthenticatedRequest, reply)
  );

  // List spending limits
  fastify.get(
    '/workspaces/:workspaceId/spending-limits',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(listSpendingLimitsSchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Spending Limit'],
        description: 'List all spending limits in workspace',
        security: [{ bearerAuth: [] }],
        params: spendingLimitWorkspaceParamsJsonSchema,
        querystring: listSpendingLimitsQueryJsonSchema,
        response: {
          200: paginatedSpendingLimitsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listLimits(request as AuthenticatedRequest, reply)
  );

  // Get spending limit by ID
  fastify.get(
    '/workspaces/:workspaceId/spending-limits/:limitId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Spending Limit'],
        description: 'Get spending limit by ID',
        security: [{ bearerAuth: [] }],
        params: spendingLimitParamsJsonSchema,
        response: {
          200: spendingLimitEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getLimit(request as AuthenticatedRequest, reply)
  );

  // Update spending limit
  fastify.patch(
    '/workspaces/:workspaceId/spending-limits/:limitId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(updateSpendingLimitSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Spending Limit'],
        description: 'Update spending limit',
        security: [{ bearerAuth: [] }],
        params: spendingLimitParamsJsonSchema,
        body: updateSpendingLimitBodyJsonSchema,
        response: {
          200: spendingLimitEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.updateLimit(request as AuthenticatedRequest, reply)
  );

  // Delete spending limit
  fastify.delete(
    '/workspaces/:workspaceId/spending-limits/:limitId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Spending Limit'],
        description: 'Delete spending limit',
        security: [{ bearerAuth: [] }],
        params: spendingLimitParamsJsonSchema,
        response: {
          204: {
            description: 'Spending limit deleted successfully',
            type: 'null',
          },
        },
      },
    },
    (request, reply) =>
      controller.deleteSpendingLimit(request as AuthenticatedRequest, reply)
  );
}
