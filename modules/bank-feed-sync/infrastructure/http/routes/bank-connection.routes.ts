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
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  workspaceId: { type: 'string', format: 'uuid' },
                  userId: { type: 'string', format: 'uuid' },
                  institutionId: { type: 'string' },
                  institutionName: { type: 'string' },
                  accountId: { type: 'string' },
                  accountName: { type: 'string' },
                  accountType: { type: 'string' },
                  accountMask: { type: 'string', nullable: true },
                  currency: { type: 'string' },
                  status: { type: 'string' },
                  lastSyncAt: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                  },
                  tokenExpiresAt: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                  },
                  errorMessage: { type: 'string', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.connectBank(request as any, reply)
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
              data: {
                type: 'object',
                properties: {
                  connections: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        workspaceId: { type: 'string', format: 'uuid' },
                        userId: { type: 'string', format: 'uuid' },
                        institutionId: { type: 'string' },
                        institutionName: { type: 'string' },
                        accountId: { type: 'string' },
                        accountName: { type: 'string' },
                        accountType: { type: 'string' },
                        accountMask: { type: 'string', nullable: true },
                        currency: { type: 'string' },
                        status: { type: 'string' },
                        lastSyncAt: {
                          type: 'string',
                          format: 'date-time',
                          nullable: true,
                        },
                        tokenExpiresAt: {
                          type: 'string',
                          format: 'date-time',
                          nullable: true,
                        },
                        errorMessage: { type: 'string', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
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
    (request, reply) => controller.getConnections(request as any, reply)
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
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  workspaceId: { type: 'string', format: 'uuid' },
                  userId: { type: 'string', format: 'uuid' },
                  institutionId: { type: 'string' },
                  institutionName: { type: 'string' },
                  accountId: { type: 'string' },
                  accountName: { type: 'string' },
                  accountType: { type: 'string' },
                  accountMask: { type: 'string', nullable: true },
                  currency: { type: 'string' },
                  status: { type: 'string' },
                  lastSyncAt: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                  },
                  tokenExpiresAt: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                  },
                  errorMessage: { type: 'string', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.getConnection(request as any, reply)
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
            },
          },
        },
      },
    },
    (request, reply) => controller.updateConnectionToken(request as any, reply)
  );

  // Disconnect bank
  fastify.put(
    '/workspaces/:workspaceId/bank-feed-sync/connections/:connectionId/disconnect',
    {
      preValidation: [validateParams(connectionParamsSchema)],
      schema: {
        tags: ['Bank Connection'],
        description: 'Disconnect a bank connection',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) => controller.disconnectBank(request as any, reply)
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
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) => controller.deleteConnection(request as any, reply)
  );
}
