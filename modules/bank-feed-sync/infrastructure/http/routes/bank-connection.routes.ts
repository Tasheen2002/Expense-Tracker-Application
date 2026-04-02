import { FastifyInstance } from 'fastify';
import { BankConnectionController } from '../controllers/bank-connection.controller';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '../../../../../apps/api/src/shared/middleware/rate-limiter.middleware';
import { validateBody, validateParams } from '../validation/validator';
import {
  connectBankBodySchema,
  connectionParamsSchema,
  updateConnectionTokenBodySchema,
  workspaceParamsSchema,
  bankConnectionResponseSchema,
  paginatedConnectionsResponseSchema,
} from '../validation/bank-sync.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function bankConnectionRoutes(
  fastify: FastifyInstance,
  controller: BankConnectionController
) {
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
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [validateBody(connectBankBodySchema)],
      schema: {
        tags: ['Bank Connection'],
        description: 'Create a bank connection',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: [
            'institutionId',
            'institutionName',
            'accountId',
            'accountName',
            'accountType',
            'currency',
            'accessToken',
          ],
          properties: {
            institutionId: { type: 'string' },
            institutionName: { type: 'string' },
            accountId: { type: 'string' },
            accountName: { type: 'string' },
            accountType: { type: 'string' },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            accessToken: { type: 'string' },
            accountMask: { type: 'string', nullable: true },
            tokenExpiresAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: bankConnectionResponseSchema,
            },
          },
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
      preValidation: [validateParams(workspaceParamsSchema)],
      schema: {
        tags: ['Bank Connection'],
        description: 'Get all bank connections in a workspace',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: paginatedConnectionsResponseSchema,
            },
          },
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
      preValidation: [validateParams(connectionParamsSchema)],
      schema: {
        tags: ['Bank Connection'],
        description: 'Get a specific bank connection',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: bankConnectionResponseSchema,
            },
          },
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
      preValidation: [validateParams(connectionParamsSchema)],
      preHandler: [validateBody(updateConnectionTokenBodySchema)],
      schema: {
        tags: ['Bank Connection'],
        description: 'Update bank connection token',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['accessToken'],
          properties: {
            accessToken: { type: 'string' },
            tokenExpiresAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: bankConnectionResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.updateConnectionToken(request as AuthenticatedRequest, reply)
  );

  // Disconnect bank
  fastify.post(
    '/workspaces/:workspaceId/bank-feed-sync/connections/:connectionId/disconnect',
    {
      preValidation: [validateParams(connectionParamsSchema)],
      schema: {
        tags: ['Bank Connection'],
        description: 'Disconnect a bank connection',
        security: [{ bearerAuth: [] }],
        response: {
          204: {
            type: 'null',
            description: 'Bank connection disconnected successfully',
          },
        },
      },
    },
    (request, reply) =>
      controller.disconnectBank(request as AuthenticatedRequest, reply)
  );

  // Delete connection
  fastify.delete(
    '/workspaces/:workspaceId/bank-feed-sync/connections/:connectionId',
    {
      preValidation: [validateParams(connectionParamsSchema)],
      schema: {
        tags: ['Bank Connection'],
        description: 'Delete a bank connection',
        security: [{ bearerAuth: [] }],
        response: {
          204: {
            type: 'null',
            description: 'Bank connection deleted successfully',
          },
        },
      },
    },
    (request, reply) =>
      controller.deleteConnection(request as AuthenticatedRequest, reply)
  );
}

