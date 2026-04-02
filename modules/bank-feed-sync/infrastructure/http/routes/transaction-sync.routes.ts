import { FastifyInstance } from 'fastify';
import { TransactionSyncController } from '../controllers/transaction-sync.controller';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
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

export async function transactionSyncRoutes(
  fastify: FastifyInstance,
  controller: TransactionSyncController
) {
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
            type: 'object',
            properties: {
              success: { type: 'boolean' },
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
            type: 'object',
            properties: {
              success: { type: 'boolean' },
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
            type: 'object',
            properties: {
              success: { type: 'boolean' },
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
            type: 'object',
            properties: {
              success: { type: 'boolean' },
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

