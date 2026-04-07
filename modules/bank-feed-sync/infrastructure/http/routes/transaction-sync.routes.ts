import { FastifyInstance } from 'fastify';
import { TransactionSyncController } from '../controllers/transaction-sync.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  connectionParamsSchema,
  paginationQuerySchema,
  sessionParamsSchema,
  syncSessionResponseSchema,
  paginatedSyncSessionsResponseSchema,
  syncTransactionsBodySchema,
  workspaceParamsSchema,
  syncAcceptedResponseSchema,
} from '../validation/bank-sync.schema';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function transactionSyncRoutes(
  fastify: FastifyInstance,
  controller: TransactionSyncController
) {
  // Apply write rate limiting to all mutation routes
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });
  // Trigger sync for a connection
  fastify.post(
    '/workspaces/:workspaceId/bank-feed-sync/connections/:connectionId/sync',
    {
      preValidation: [validateParams(connectionParamsSchema)],
      preHandler: [validateBody(syncTransactionsBodySchema)],
      schema: {
        tags: ['Transaction Sync'],
        description: 'Trigger sync for a bank connection',
        security: [{ bearerAuth: [] }],
        response: {
          202: {
            description: 'Sync request accepted successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: syncAcceptedResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.syncTransactions(request as AuthenticatedRequest, reply)
  );

  // Get sync history for a connection
  fastify.get(
    '/workspaces/:workspaceId/bank-feed-sync/connections/:connectionId/sync/history',
    {
      preValidation: [
        validateParams(connectionParamsSchema),
        validateQuery(paginationQuerySchema),
      ],
      schema: {
        tags: ['Transaction Sync'],
        description: 'Get sync history for a bank connection',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Sync history retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: paginatedSyncSessionsResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getSyncHistory(request as AuthenticatedRequest, reply)
  );

  // Get specific sync session
  fastify.get(
    '/workspaces/:workspaceId/bank-feed-sync/sync/:sessionId',
    {
      preValidation: [validateParams(sessionParamsSchema)],
      schema: {
        tags: ['Transaction Sync'],
        description: 'Get specific sync session details',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Sync session retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: syncSessionResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getSyncSession(request as AuthenticatedRequest, reply)
  );

  // Get all active syncs
  fastify.get(
    '/workspaces/:workspaceId/bank-feed-sync/sync/active',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(paginationQuerySchema),
      ],
      schema: {
        tags: ['Transaction Sync'],
        description: 'Get all active sync sessions in a workspace',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Active sync sessions retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: paginatedSyncSessionsResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getActiveSyncs(request as AuthenticatedRequest, reply)
  );
}

