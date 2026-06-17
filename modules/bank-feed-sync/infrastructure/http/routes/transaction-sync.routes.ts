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
  syncTransactionsBodySchema,
  workspaceParamsSchema,
  workspaceParamsJsonSchema,
  connectionParamsJsonSchema,
  sessionParamsJsonSchema,
  syncTransactionsBodyJsonSchema,
  paginationQueryJsonSchema,
  syncSessionEnvelopeJsonSchema,
  paginatedSyncSessionsEnvelopeJsonSchema,
  syncAcceptedEnvelopeJsonSchema,
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
        params: connectionParamsJsonSchema,
        body: syncTransactionsBodyJsonSchema,
        response: {
          202: syncAcceptedEnvelopeJsonSchema,
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
        params: connectionParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: paginatedSyncSessionsEnvelopeJsonSchema,
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
        params: sessionParamsJsonSchema,
        response: {
          200: syncSessionEnvelopeJsonSchema,
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
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: paginatedSyncSessionsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getActiveSyncs(request as AuthenticatedRequest, reply)
  );
}

