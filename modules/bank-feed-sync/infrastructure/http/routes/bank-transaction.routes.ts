import { FastifyInstance } from 'fastify';
import { BankTransactionController } from '../controllers/bank-transaction.controller';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  endpointKeyGenerator,
} from '../../../../../apps/api/src/shared/middleware/rate-limiter.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  transactionParamsSchema,
  workspaceParamsSchema,
  bankTransactionResponseSchema,
  paginatedTransactionsResponseSchema,
  pendingTransactionsQuerySchema,
  processTransactionBodySchema,
  connectionParamsSchema,
  paginationQuerySchema,
} from '../validation/bank-sync.schema.js';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: endpointKeyGenerator,
});

export async function bankTransactionRoutes(
  fastify: FastifyInstance,
  controller: BankTransactionController
) {
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Get pending transactions
  fastify.get(
    '/workspaces/:workspaceId/bank-feed-sync/transactions/pending',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(pendingTransactionsQuerySchema),
      ],
      schema: {
        tags: ['Bank Transaction'],
        description: 'Get pending bank transactions in a workspace',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: paginatedTransactionsResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getPendingTransactions(request as AuthenticatedRequest, reply)
  );

  // Get specific transaction
  fastify.get(
    '/workspaces/:workspaceId/bank-feed-sync/transactions/:transactionId',
    {
      preValidation: [validateParams(transactionParamsSchema)],
      schema: {
        tags: ['Bank Transaction'],
        description: 'Get a specific bank transaction',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: bankTransactionResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getTransaction(request as AuthenticatedRequest, reply)
  );

  // Process transaction (import/match/ignore)
  fastify.put(
    '/workspaces/:workspaceId/bank-feed-sync/transactions/:transactionId/process',
    {
      preValidation: [
        validateParams(transactionParamsSchema),
        validateBody(processTransactionBodySchema),
      ],
      schema: {
        tags: ['Bank Transaction'],
        description: 'Process a bank transaction (import, match, or ignore)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['action'],
          properties: {
            action: { type: 'string', enum: ['import', 'match', 'ignore'] },
            expenseId: { type: 'string', format: 'uuid', nullable: true },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: bankTransactionResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.processTransaction(request as AuthenticatedRequest, reply)
  );

  // Get transactions by connection
  fastify.get(
    '/workspaces/:workspaceId/bank-feed-sync/transactions/connection/:connectionId',
    {
      preValidation: [
        validateParams(connectionParamsSchema),
        validateQuery(paginationQuerySchema),
      ],
      schema: {
        tags: ['Bank Transaction'],
        description: 'Get all transactions for a specific bank connection',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: paginatedTransactionsResponseSchema,
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getTransactionsByConnection(request as AuthenticatedRequest, reply)
  );
}

