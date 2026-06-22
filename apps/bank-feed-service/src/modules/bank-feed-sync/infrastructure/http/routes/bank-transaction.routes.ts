import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BankTransactionController } from '../controllers/bank-transaction.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  endpointKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import { validateBody, validateQuery } from '../validation/validator';
import {
  pendingTransactionsQuerySchema,
  processTransactionBodySchema,
  paginationQuerySchema,
  workspaceParamsJsonSchema,
  connectionParamsJsonSchema,
  transactionParamsJsonSchema,
  processTransactionBodyJsonSchema,
  paginationQueryJsonSchema,
  pendingTransactionsQueryJsonSchema,
  bankTransactionEnvelopeJsonSchema,
  paginatedTransactionsEnvelopeJsonSchema,
  processTransactionEnvelopeJsonSchema,
} from '../validation/bank-sync.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: endpointKeyGenerator,
});

export async function bankTransactionRoutes(
  fastify: FastifyInstance,
  controller: BankTransactionController
) {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, request.server.prisma);
  };

  fastify.addHook('preHandler', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Get pending transactions
  fastify.get(
    '/workspaces/:workspaceId/bank-feed-sync/transactions/pending',
    {
      onRequest: [fastify.authenticate],
      preHandler: [validateQuery(pendingTransactionsQuerySchema), workspaceAuth],
      schema: {
        tags: ['Bank Transaction'],
        description: 'Get pending bank transactions in a workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: pendingTransactionsQueryJsonSchema,
        response: {
          200: paginatedTransactionsEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Bank Transaction'],
        description: 'Get a specific bank transaction',
        security: [{ bearerAuth: [] }],
        params: transactionParamsJsonSchema,
        response: {
          200: bankTransactionEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [validateBody(processTransactionBodySchema), workspaceAuth],
      schema: {
        tags: ['Bank Transaction'],
        description: 'Process a bank transaction (import, match, or ignore)',
        security: [{ bearerAuth: [] }],
        params: transactionParamsJsonSchema,
        body: processTransactionBodyJsonSchema,
        response: {
          200: processTransactionEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [validateQuery(paginationQuerySchema), workspaceAuth],
      schema: {
        tags: ['Bank Transaction'],
        description: 'Get all transactions for a specific bank connection',
        security: [{ bearerAuth: [] }],
        params: connectionParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: paginatedTransactionsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getTransactionsByConnection(request as AuthenticatedRequest, reply)
  );
}
