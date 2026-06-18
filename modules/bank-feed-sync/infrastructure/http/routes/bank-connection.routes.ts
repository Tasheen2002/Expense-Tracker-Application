import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BankConnectionController } from '../controllers/bank-connection.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';
import { validateBody } from '../validation/validator';
import {
  connectBankBodySchema,
  updateConnectionTokenBodySchema,
  workspaceParamsJsonSchema,
  connectionParamsJsonSchema,
  connectBankBodyJsonSchema,
  updateConnectionTokenBodyJsonSchema,
  bankConnectionEnvelopeJsonSchema,
  paginatedConnectionsEnvelopeJsonSchema,
} from '../validation/bank-sync.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function bankConnectionRoutes(
  fastify: FastifyInstance,
  controller: BankConnectionController
) {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, request.server.prisma);
  };

  // Apply write rate limiting to all mutation routes
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create bank connection
  fastify.post(
    '/workspaces/:workspaceId/bank-feed-sync/connections',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(connectBankBodySchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Bank Connection'],
        description: 'Create a bank connection',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: connectBankBodyJsonSchema,
        response: {
          201: bankConnectionEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.connectBank(request as AuthenticatedRequest, reply)
  );

  // Get all connections
  fastify.get(
    '/workspaces/:workspaceId/bank-feed-sync/connections',
    {
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Bank Connection'],
        description: 'Get all bank connections in a workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        response: {
          200: paginatedConnectionsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getConnections(request as AuthenticatedRequest, reply)
  );

  // Get specific connection
  fastify.get(
    '/workspaces/:workspaceId/bank-feed-sync/connections/:connectionId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Bank Connection'],
        description: 'Get a specific bank connection',
        security: [{ bearerAuth: [] }],
        params: connectionParamsJsonSchema,
        response: {
          200: bankConnectionEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getConnection(request as AuthenticatedRequest, reply)
  );

  // Update connection token
  fastify.put(
    '/workspaces/:workspaceId/bank-feed-sync/connections/:connectionId/token',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(updateConnectionTokenBodySchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Bank Connection'],
        description: 'Update bank connection token',
        security: [{ bearerAuth: [] }],
        params: connectionParamsJsonSchema,
        body: updateConnectionTokenBodyJsonSchema,
        response: {
          200: bankConnectionEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.updateConnectionToken(request as AuthenticatedRequest, reply)
  );

  // Disconnect bank connection
  fastify.post(
    '/workspaces/:workspaceId/bank-feed-sync/connections/:connectionId/disconnect',
    {
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth, RolePermissions.ADMIN_LEVEL],
      schema: {
        tags: ['Bank Connection'],
        description: 'Disconnect a bank connection',
        security: [{ bearerAuth: [] }],
        params: connectionParamsJsonSchema,
        response: {
          204: {
            description: 'No Content',
            type: 'null',
          },
        },
      },
    },
    (request, reply) =>
      controller.disconnectBank(request as AuthenticatedRequest, reply)
  );

  // Delete bank connection
  fastify.delete(
    '/workspaces/:workspaceId/bank-feed-sync/connections/:connectionId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth, RolePermissions.ADMIN_LEVEL],
      schema: {
        tags: ['Bank Connection'],
        description: 'Delete a bank connection',
        security: [{ bearerAuth: [] }],
        params: connectionParamsJsonSchema,
        response: {
          204: {
            description: 'No Content',
            type: 'null',
          },
        },
      },
    },
    (request, reply) =>
      controller.deleteConnection(request as AuthenticatedRequest, reply)
  );
}
