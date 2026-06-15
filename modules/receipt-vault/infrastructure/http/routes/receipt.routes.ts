import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ReceiptController } from '../controllers/receipt.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  workspaceParamsSchema,
  receiptParamsSchema,
  receiptTagParamsSchema,
  expenseParamsSchema,
  workspaceParamsJsonSchema,
  receiptParamsJsonSchema,
  receiptTagParamsJsonSchema,
  expenseParamsJsonSchema,
  baseResponseJsonSchema,
} from '../validation/common.schema';
import {
  uploadReceiptSchema,
  linkToExpenseSchema,
  processReceiptSchema,
  rejectReceiptSchema,
  listReceiptsQuerySchema,
  deleteReceiptQuerySchema,
  uploadReceiptBodyJsonSchema,
  linkToExpenseBodyJsonSchema,
  processReceiptBodyJsonSchema,
  rejectReceiptBodyJsonSchema,
  listReceiptsQueryJsonSchema,
  deleteReceiptQueryJsonSchema,
  receiptEnvelopeJsonSchema,
  receiptListEnvelopeJsonSchema,
  receiptStatsEnvelopeJsonSchema,
} from '../validation/receipt.schema';
import {
  addMetadataSchema,
  updateMetadataSchema,
  addMetadataBodyJsonSchema,
  updateMetadataBodyJsonSchema,
  receiptMetadataEnvelopeJsonSchema,
} from '../validation/metadata.schema';
import {
  addTagToReceiptSchema,
  addTagToReceiptBodyJsonSchema,
} from '../validation/tag.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function receiptRoutes(
  fastify: FastifyInstance,
  controller: ReceiptController,
  prisma: PrismaClient
): Promise<void> {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, prisma);
  };

  // Apply write rate limiting to all mutation routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Upload receipt
  fastify.post(
    '/:workspaceId/receipts/upload',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateBody(uploadReceiptSchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt'],
        description: 'Upload a new receipt',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: uploadReceiptBodyJsonSchema,
        response: {
          201: receiptEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.uploadReceipt(request as AuthenticatedRequest, reply)
  );

  // Get receipt by ID
  fastify.get(
    '/:workspaceId/receipts/:receiptId',
    {
      preValidation: [
        validateParams(receiptParamsSchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt'],
        description: 'Get receipt by ID',
        security: [{ bearerAuth: [] }],
        params: receiptParamsJsonSchema,
        response: {
          200: receiptEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getReceipt(request as AuthenticatedRequest, reply)
  );

  // List receipts
  fastify.get(
    '/:workspaceId/receipts',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
        validateQuery(listReceiptsQuerySchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt'],
        description: 'List all receipts in workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: listReceiptsQueryJsonSchema,
        response: {
          200: receiptListEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listReceipts(request as AuthenticatedRequest, reply)
  );

  // Get receipts by expense
  fastify.get(
    '/:workspaceId/expenses/:expenseId/receipts',
    {
      preValidation: [
        validateParams(expenseParamsSchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt'],
        description: 'Get all receipts linked to an expense',
        security: [{ bearerAuth: [] }],
        params: expenseParamsJsonSchema,
        response: {
          200: receiptListEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getReceiptsByExpense(request as AuthenticatedRequest, reply)
  );

  // Link receipt to expense
  fastify.post(
    '/:workspaceId/receipts/:receiptId/link-expense',
    {
      preValidation: [
        validateParams(receiptParamsSchema),
        validateBody(linkToExpenseSchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt'],
        description: 'Link receipt to an expense',
        security: [{ bearerAuth: [] }],
        params: receiptParamsJsonSchema,
        body: linkToExpenseBodyJsonSchema,
        response: {
          200: receiptEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.linkToExpense(request as AuthenticatedRequest, reply)
  );

  // Unlink receipt from expense
  fastify.delete(
    '/:workspaceId/receipts/:receiptId/unlink-expense',
    {
      preValidation: [
        validateParams(receiptParamsSchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt'],
        description: 'Unlink receipt from expense',
        security: [{ bearerAuth: [] }],
        params: receiptParamsJsonSchema,
        response: {
          200: baseResponseJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.unlinkFromExpense(request as AuthenticatedRequest, reply)
  );

  // Process receipt (OCR/AI extraction)
  fastify.post(
    '/:workspaceId/receipts/:receiptId/process',
    {
      preValidation: [
        validateParams(receiptParamsSchema),
        validateBody(processReceiptSchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt'],
        description: 'Process receipt to extract metadata',
        security: [{ bearerAuth: [] }],
        params: receiptParamsJsonSchema,
        body: processReceiptBodyJsonSchema,
        response: {
          200: receiptEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.processReceipt(request as AuthenticatedRequest, reply)
  );

  // Verify receipt
  fastify.post(
    '/:workspaceId/receipts/:receiptId/verify',
    {
      preValidation: [
        validateParams(receiptParamsSchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt'],
        description: 'Mark receipt as verified',
        security: [{ bearerAuth: [] }],
        params: receiptParamsJsonSchema,
        response: {
          200: receiptEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.verifyReceipt(request as AuthenticatedRequest, reply)
  );

  // Reject receipt
  fastify.post(
    '/:workspaceId/receipts/:receiptId/reject',
    {
      preValidation: [
        validateParams(receiptParamsSchema),
        validateBody(rejectReceiptSchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt'],
        description: 'Mark receipt as rejected',
        security: [{ bearerAuth: [] }],
        params: receiptParamsJsonSchema,
        body: rejectReceiptBodyJsonSchema,
        response: {
          200: receiptEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.rejectReceipt(request as AuthenticatedRequest, reply)
  );

  // Delete receipt
  fastify.delete(
    '/:workspaceId/receipts/:receiptId',
    {
      preValidation: [
        validateParams(receiptParamsSchema),
        validateQuery(deleteReceiptQuerySchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt'],
        description: 'Delete a receipt',
        security: [{ bearerAuth: [] }],
        params: receiptParamsJsonSchema,
        querystring: deleteReceiptQueryJsonSchema,
        response: {
          200: baseResponseJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.deleteReceipt(request as AuthenticatedRequest, reply)
  );

  // Add metadata
  fastify.post(
    '/:workspaceId/receipts/:receiptId/metadata',
    {
      preValidation: [
        validateParams(receiptParamsSchema),
        validateBody(addMetadataSchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt Metadata'],
        description: 'Add metadata to receipt',
        security: [{ bearerAuth: [] }],
        params: receiptParamsJsonSchema,
        body: addMetadataBodyJsonSchema,
        response: {
          201: receiptMetadataEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.addMetadata(request as AuthenticatedRequest, reply)
  );

  // Update metadata (PATCH - partial update)
  fastify.patch(
    '/:workspaceId/receipts/:receiptId/metadata',
    {
      preValidation: [
        validateParams(receiptParamsSchema),
        validateBody(updateMetadataSchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt Metadata'],
        description: 'Update receipt metadata',
        security: [{ bearerAuth: [] }],
        params: receiptParamsJsonSchema,
        body: updateMetadataBodyJsonSchema,
        response: {
          200: receiptMetadataEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.updateMetadata(request as AuthenticatedRequest, reply)
  );

  // Get metadata
  fastify.get(
    '/:workspaceId/receipts/:receiptId/metadata',
    {
      preValidation: [
        validateParams(receiptParamsSchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt Metadata'],
        description: 'Get receipt metadata',
        security: [{ bearerAuth: [] }],
        params: receiptParamsJsonSchema,
        response: {
          200: receiptMetadataEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getMetadata(request as AuthenticatedRequest, reply)
  );

  // Add tag to receipt
  fastify.post(
    '/:workspaceId/receipts/:receiptId/tags',
    {
      preValidation: [
        validateParams(receiptParamsSchema),
        validateBody(addTagToReceiptSchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt'],
        description: 'Add tag to receipt',
        security: [{ bearerAuth: [] }],
        params: receiptParamsJsonSchema,
        body: addTagToReceiptBodyJsonSchema,
        response: {
          200: baseResponseJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.addTag(request as AuthenticatedRequest, reply)
  );

  // Remove tag from receipt
  fastify.delete(
    '/:workspaceId/receipts/:receiptId/tags/:tagId',
    {
      preValidation: [
        validateParams(receiptTagParamsSchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt'],
        description: 'Remove tag from receipt',
        security: [{ bearerAuth: [] }],
        params: receiptTagParamsJsonSchema,
        response: {
          200: baseResponseJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.removeTag(request as AuthenticatedRequest, reply)
  );

  // Get receipt statistics
  fastify.get(
    '/:workspaceId/receipts/stats',
    {
      preValidation: [
        validateParams(workspaceParamsSchema),
      ],
      preHandler: [fastify.authenticate, workspaceAuth],
      schema: {
        tags: ['Receipt'],
        description: 'Get receipt statistics for workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        response: {
          200: receiptStatsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getStats(request as AuthenticatedRequest, reply)
  );
}
