import { ZodSchema } from 'zod';
import { FastifyInstance } from 'fastify';
import { ReceiptController } from '../controllers/receipt.controller';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '../../../../../apps/api/src/shared/middleware/rate-limiter.middleware';
import { validateBody, validateQuery } from '../validation/validator';
import {
  uploadReceiptSchema,
  linkToExpenseSchema,
  processReceiptSchema,
  rejectReceiptSchema,
  listReceiptsQuerySchema,
  deleteReceiptQuerySchema,
} from '../validation/receipt.schema';
import {
  addMetadataSchema,
  updateMetadataSchema,
} from '../validation/metadata.schema';
import { addTagToReceiptSchema } from '../validation/tag.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

// Reusable schema fragments
const receiptDataSchema = {
  type: 'object',
  properties: {
    receiptId: { type: 'string' },
    workspaceId: { type: 'string' },
    expenseId: { type: 'string' },
    userId: { type: 'string' },
    fileName: { type: 'string' },
    originalName: { type: 'string' },
    filePath: { type: 'string' },
    fileSize: { type: 'number' },
    mimeType: { type: 'string' },
    fileHash: { type: 'string' },
    receiptType: { type: 'string' },
    status: { type: 'string' },
    storageProvider: { type: 'string' },
    storageBucket: { type: 'string' },
    storageKey: { type: 'string' },
    thumbnailPath: { type: 'string' },
    ocrText: { type: 'string' },
    ocrConfidence: { type: 'number' },
    processedAt: { type: 'string' },
    failureReason: { type: 'string' },
    isLinked: { type: 'boolean' },
    isDeleted: { type: 'boolean' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    deletedAt: { type: 'string' },
  },
};

const metadataDataSchema = {
  type: 'object',
  properties: {
    metadataId: { type: 'string' },
    receiptId: { type: 'string' },
    merchantName: { type: 'string' },
    merchantAddress: { type: 'string' },
    merchantPhone: { type: 'string' },
    merchantTaxId: { type: 'string' },
    transactionDate: { type: 'string' },
    transactionTime: { type: 'string' },
    subtotal: { type: 'number' },
    taxAmount: { type: 'number' },
    tipAmount: { type: 'number' },
    totalAmount: { type: 'number' },
    currency: { type: 'string' },
    paymentMethod: { type: 'string' },
    lastFourDigits: { type: 'string' },
    invoiceNumber: { type: 'string' },
    poNumber: { type: 'string' },
    lineItems: { type: 'array' },
    notes: { type: 'string' },
    customFields: { type: 'object' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};

const successResponse = (statusCode: number, dataSchema?: object) => ({
  [statusCode]: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      statusCode: { type: 'number' },
      message: { type: 'string' },
      ...(dataSchema ? { data: dataSchema } : {}),
    },
  },
});

export async function receiptRoutes(
  fastify: FastifyInstance,
  controller: ReceiptController
) {
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
      preValidation: [validateBody(uploadReceiptSchema)],
      schema: {
        tags: ['Receipt'],
        description: 'Upload a new receipt',
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: [
            'fileName',
            'originalName',
            'filePath',
            'fileSize',
            'mimeType',
            'storageProvider',
          ],
          properties: {
            fileName: { type: 'string', minLength: 1, maxLength: 255 },
            originalName: { type: 'string', minLength: 1, maxLength: 255 },
            filePath: { type: 'string', minLength: 1, maxLength: 1000 },
            fileSize: { type: 'number' },
            mimeType: { type: 'string' },
            fileHash: { type: 'string' },
            receiptType: { type: 'string' },
            storageProvider: { type: 'string' },
            storageBucket: { type: 'string' },
            storageKey: { type: 'string' },
          },
        },
        response: successResponse(201, receiptDataSchema),
      },
    },
    (request, reply) =>
      controller.uploadReceipt(request as AuthenticatedRequest, reply)
  );

  // Get receipt by ID
  fastify.get(
    '/:workspaceId/receipts/:receiptId',
    {
      schema: {
        tags: ['Receipt'],
        description: 'Get receipt by ID',
        params: {
          type: 'object',
          required: ['workspaceId', 'receiptId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            receiptId: { type: 'string', format: 'uuid' },
          },
        },
        response: successResponse(200, receiptDataSchema),
      },
    },
    (request, reply) =>
      controller.getReceipt(request as AuthenticatedRequest, reply)
  );

  // List receipts
  fastify.get(
    '/:workspaceId/receipts',
    {
      preValidation: [validateQuery(listReceiptsQuerySchema as ZodSchema<any>)],
      schema: {
        tags: ['Receipt'],
        description: 'List all receipts in workspace',
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
            expenseId: { type: 'string', format: 'uuid' },
            status: { type: 'string' },
            receiptType: { type: 'string' },
            isLinked: { type: 'string', enum: ['true', 'false'] },
            isDeleted: { type: 'string', enum: ['true', 'false'] },
            fromDate: { type: 'string' },
            toDate: { type: 'string' },
            limit: { type: 'string' },
            offset: { type: 'string' },
          },
        },
        response: successResponse(200, {
          type: 'object',
          properties: {
            items: { type: 'array', items: receiptDataSchema },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                limit: { type: 'number' },
                offset: { type: 'number' },
                hasMore: { type: 'boolean' },
              },
            },
          },
        }),
      },
    },
    (request, reply) =>
      controller.listReceipts(request as AuthenticatedRequest, reply)
  );

  // Get receipts by expense
  fastify.get(
    '/:workspaceId/expenses/:expenseId/receipts',
    {
      schema: {
        tags: ['Receipt'],
        description: 'Get all receipts linked to an expense',
        params: {
          type: 'object',
          required: ['workspaceId', 'expenseId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            expenseId: { type: 'string', format: 'uuid' },
          },
        },
        response: successResponse(200, {
          type: 'object',
          properties: {
            items: { type: 'array', items: receiptDataSchema },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                limit: { type: 'number' },
                offset: { type: 'number' },
                hasMore: { type: 'boolean' },
              },
            },
          },
        }),
      },
    },
    (request, reply) =>
      controller.getReceiptsByExpense(request as AuthenticatedRequest, reply)
  );

  // Link receipt to expense
  fastify.post(
    '/:workspaceId/receipts/:receiptId/link-expense',
    {
      preValidation: [validateBody(linkToExpenseSchema)],
      schema: {
        tags: ['Receipt'],
        description: 'Link receipt to an expense',
        params: {
          type: 'object',
          required: ['workspaceId', 'receiptId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            receiptId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['expenseId'],
          properties: {
            expenseId: { type: 'string', format: 'uuid' },
          },
        },
        response: successResponse(200, receiptDataSchema),
      },
    },
    (request, reply) =>
      controller.linkToExpense(request as AuthenticatedRequest, reply)
  );

  // Unlink receipt from expense
  fastify.delete(
    '/:workspaceId/receipts/:receiptId/unlink-expense',
    {
      schema: {
        tags: ['Receipt'],
        description: 'Unlink receipt from expense',
        params: {
          type: 'object',
          required: ['workspaceId', 'receiptId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            receiptId: { type: 'string', format: 'uuid' },
          },
        },
        response: successResponse(200),
      },
    },
    (request, reply) =>
      controller.unlinkFromExpense(request as AuthenticatedRequest, reply)
  );

  // Process receipt (OCR/AI extraction)
  fastify.post(
    '/:workspaceId/receipts/:receiptId/process',
    {
      preValidation: [validateBody(processReceiptSchema)],
      schema: {
        tags: ['Receipt'],
        description: 'Process receipt to extract metadata',
        params: {
          type: 'object',
          required: ['workspaceId', 'receiptId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            receiptId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            ocrText: { type: 'string' },
            ocrConfidence: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
        response: successResponse(200, receiptDataSchema),
      },
    },
    (request, reply) =>
      controller.processReceipt(request as AuthenticatedRequest, reply)
  );

  // Verify receipt
  fastify.post(
    '/:workspaceId/receipts/:receiptId/verify',
    {
      schema: {
        tags: ['Receipt'],
        description: 'Mark receipt as verified',
        params: {
          type: 'object',
          required: ['workspaceId', 'receiptId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            receiptId: { type: 'string', format: 'uuid' },
          },
        },
        response: successResponse(200, receiptDataSchema),
      },
    },
    (request, reply) =>
      controller.verifyReceipt(request as AuthenticatedRequest, reply)
  );

  // Reject receipt
  fastify.post(
    '/:workspaceId/receipts/:receiptId/reject',
    {
      preValidation: [validateBody(rejectReceiptSchema)],
      schema: {
        tags: ['Receipt'],
        description: 'Mark receipt as rejected',
        params: {
          type: 'object',
          required: ['workspaceId', 'receiptId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            receiptId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string', maxLength: 500 },
          },
        },
        response: successResponse(200, receiptDataSchema),
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
        validateQuery(deleteReceiptQuerySchema as ZodSchema<any>),
      ],
      schema: {
        tags: ['Receipt'],
        description: 'Delete a receipt',
        params: {
          type: 'object',
          required: ['workspaceId', 'receiptId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            receiptId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            permanent: { type: 'string', enum: ['true', 'false'] },
          },
        },
        response: successResponse(200),
      },
    },
    (request, reply) =>
      controller.deleteReceipt(request as AuthenticatedRequest, reply)
  );

  // Add metadata
  fastify.post(
    '/:workspaceId/receipts/:receiptId/metadata',
    {
      preValidation: [validateBody(addMetadataSchema as ZodSchema<any>)],
      schema: {
        tags: ['Receipt Metadata'],
        description: 'Add metadata to receipt',
        params: {
          type: 'object',
          required: ['workspaceId', 'receiptId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            receiptId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            merchantName: { type: 'string', maxLength: 255 },
            merchantAddress: { type: 'string', maxLength: 500 },
            merchantPhone: { type: 'string', maxLength: 50 },
            merchantTaxId: { type: 'string', maxLength: 50 },
            transactionDate: {},
            transactionTime: { type: 'string', maxLength: 20 },
            subtotal: { type: 'number' },
            taxAmount: { type: 'number' },
            tipAmount: { type: 'number' },
            totalAmount: { type: 'number' },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            paymentMethod: { type: 'string', maxLength: 50 },
            lastFourDigits: { type: 'string', minLength: 4, maxLength: 4 },
            invoiceNumber: { type: 'string', maxLength: 100 },
            poNumber: { type: 'string', maxLength: 100 },
            notes: { type: 'string', maxLength: 1000 },
          },
        },
        response: successResponse(201, metadataDataSchema),
      },
    },
    (request, reply) =>
      controller.addMetadata(request as AuthenticatedRequest, reply)
  );

  // Update metadata (PATCH - partial update)
  fastify.patch(
    '/:workspaceId/receipts/:receiptId/metadata',
    {
      preValidation: [validateBody(updateMetadataSchema as ZodSchema<any>)],
      schema: {
        tags: ['Receipt Metadata'],
        description: 'Update receipt metadata',
        params: {
          type: 'object',
          required: ['workspaceId', 'receiptId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            receiptId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            merchantName: { type: 'string', maxLength: 255 },
            merchantAddress: { type: 'string', maxLength: 500 },
            merchantPhone: { type: 'string', maxLength: 50 },
            merchantTaxId: { type: 'string', maxLength: 50 },
            transactionDate: {},
            transactionTime: { type: 'string', maxLength: 20 },
            subtotal: { type: 'number' },
            taxAmount: { type: 'number' },
            tipAmount: { type: 'number' },
            totalAmount: { type: 'number' },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            paymentMethod: { type: 'string', maxLength: 50 },
            lastFourDigits: { type: 'string', minLength: 4, maxLength: 4 },
            invoiceNumber: { type: 'string', maxLength: 100 },
            poNumber: { type: 'string', maxLength: 100 },
            notes: { type: 'string', maxLength: 1000 },
          },
        },
        response: successResponse(200, metadataDataSchema),
      },
    },
    (request, reply) =>
      controller.updateMetadata(request as AuthenticatedRequest, reply)
  );

  // Get metadata
  fastify.get(
    '/:workspaceId/receipts/:receiptId/metadata',
    {
      schema: {
        tags: ['Receipt Metadata'],
        description: 'Get receipt metadata',
        params: {
          type: 'object',
          required: ['workspaceId', 'receiptId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            receiptId: { type: 'string', format: 'uuid' },
          },
        },
        response: successResponse(200, metadataDataSchema),
      },
    },
    (request, reply) =>
      controller.getMetadata(request as AuthenticatedRequest, reply)
  );

  // Add tag to receipt
  fastify.post(
    '/:workspaceId/receipts/:receiptId/tags',
    {
      preValidation: [validateBody(addTagToReceiptSchema)],
      schema: {
        tags: ['Receipt'],
        description: 'Add tag to receipt',
        params: {
          type: 'object',
          required: ['workspaceId', 'receiptId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            receiptId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['tagId'],
          properties: {
            tagId: { type: 'string', format: 'uuid' },
          },
        },
        response: successResponse(200),
      },
    },
    (request, reply) =>
      controller.addTag(request as AuthenticatedRequest, reply)
  );

  // Remove tag from receipt
  fastify.delete(
    '/:workspaceId/receipts/:receiptId/tags/:tagId',
    {
      schema: {
        tags: ['Receipt'],
        description: 'Remove tag from receipt',
        params: {
          type: 'object',
          required: ['workspaceId', 'receiptId', 'tagId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            receiptId: { type: 'string', format: 'uuid' },
            tagId: { type: 'string', format: 'uuid' },
          },
        },
        response: successResponse(200),
      },
    },
    (request, reply) =>
      controller.removeTag(request as AuthenticatedRequest, reply)
  );

  // Get receipt statistics
  fastify.get(
    '/:workspaceId/receipts/stats',
    {
      schema: {
        tags: ['Receipt'],
        description: 'Get receipt statistics for workspace',
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        response: successResponse(200, {
          type: 'object',
          properties: {
            total: { type: 'number' },
            pending: { type: 'number' },
            processing: { type: 'number' },
            processed: { type: 'number' },
            failed: { type: 'number' },
            verified: { type: 'number' },
          },
        }),
      },
    },
    (request, reply) =>
      controller.getStats(request as AuthenticatedRequest, reply)
  );
}
