import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TransactionSyncController } from '../controllers/transaction-sync.controller';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { validateBody, validateQuery } from '../validation/validator';
import {
  paginationQuerySchema,
  syncTransactionsBodySchema,
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
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function transactionSyncRoutes(
  fastify: FastifyInstance,
  controller: TransactionSyncController
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

  // Trigger sync for a connection
  fastify.post(
    '/workspaces/:workspaceId/bank-feed-sync/connections/:connectionId/sync',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(syncTransactionsBodySchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
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
      onRequest: [fastify.authenticate],
      preHandler: [validateQuery(paginationQuerySchema), workspaceAuth],
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
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
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
      onRequest: [fastify.authenticate],
      preHandler: [validateQuery(paginationQuerySchema), workspaceAuth],
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
