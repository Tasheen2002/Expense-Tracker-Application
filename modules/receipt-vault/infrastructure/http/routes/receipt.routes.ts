import { FastifyInstance } from 'fastify'
import { ReceiptController } from '../controllers/receipt.controller'
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface'
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '../../../../../apps/api/src/shared/middleware/rate-limiter.middleware'

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
})

export async function receiptRoutes(
  fastify: FastifyInstance,
  controller: ReceiptController
) {
  // Apply write rate limiting to all mutation routes
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply)
    }
  })
  // Upload receipt
  fastify.post(
    '/:workspaceId/receipts/upload',
    {
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
          required: ['fileName', 'fileSize', 'mimeType', 'storageUrl'],
          properties: {
            fileName: { type: 'string', minLength: 1, maxLength: 255 },
            fileSize: { type: 'number', minimum: 1 },
            mimeType: { type: 'string', minLength: 1, maxLength: 100 },
            storageUrl: { type: 'string', minLength: 1 },
            expenseId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (request, reply) => controller.uploadReceipt(request as AuthenticatedRequest, reply)
  )

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
      },
    },
    (request, reply) => controller.getReceipt(request as AuthenticatedRequest, reply)
  )

  // List receipts
  fastify.get(
    '/:workspaceId/receipts',
    {
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
      },
    },
    (request, reply) => controller.listReceipts(request as AuthenticatedRequest, reply)
  )

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
      },
    },
    (request, reply) => controller.getReceiptsByExpense(request as AuthenticatedRequest, reply)
  )

  // Link receipt to expense
  fastify.post(
    '/:workspaceId/receipts/:receiptId/link-expense',
    {
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
      },
    },
    (request, reply) => controller.linkToExpense(request as AuthenticatedRequest, reply)
  )

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
      },
    },
    (request, reply) => controller.unlinkFromExpense(request as AuthenticatedRequest, reply)
  )

  // Process receipt (OCR/AI extraction)
  fastify.post(
    '/:workspaceId/receipts/:receiptId/process',
    {
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
      },
    },
    (request, reply) => controller.processReceipt(request as AuthenticatedRequest, reply)
  )

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
      },
    },
    (request, reply) => controller.verifyReceipt(request as AuthenticatedRequest, reply)
  )

  // Reject receipt
  fastify.post(
    '/:workspaceId/receipts/:receiptId/reject',
    {
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
      },
    },
    (request, reply) => controller.rejectReceipt(request as AuthenticatedRequest, reply)
  )

  // Delete receipt
  fastify.delete(
    '/:workspaceId/receipts/:receiptId',
    {
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
      },
    },
    (request, reply) => controller.deleteReceipt(request as AuthenticatedRequest, reply)
  )

  // Add metadata
  fastify.post(
    '/:workspaceId/receipts/:receiptId/metadata',
    {
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
            merchantAddress: { type: 'string' },
            merchantPhone: { type: 'string', maxLength: 50 },
            merchantTaxId: { type: 'string', maxLength: 50 },
            transactionDate: { type: 'string', format: 'date' },
            transactionTime: { type: 'string', maxLength: 20 },
            subtotal: { type: 'number' },
            taxAmount: { type: 'number' },
            tipAmount: { type: 'number' },
            totalAmount: { type: 'number' },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            paymentMethod: { type: 'string', maxLength: 50 },
            lastFourDigits: { type: 'string', maxLength: 4 },
            invoiceNumber: { type: 'string', maxLength: 100 },
            poNumber: { type: 'string', maxLength: 100 },
            lineItems: { type: 'array' },
            notes: { type: 'string' },
            customFields: { type: 'object' },
          },
        },
      },
    },
    (request, reply) => controller.addMetadata(request as AuthenticatedRequest, reply)
  )

  // Update metadata
  fastify.put(
    '/:workspaceId/receipts/:receiptId/metadata',
    {
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
            merchantAddress: { type: 'string' },
            merchantPhone: { type: 'string', maxLength: 50 },
            merchantTaxId: { type: 'string', maxLength: 50 },
            transactionDate: { type: 'string', format: 'date' },
            transactionTime: { type: 'string', maxLength: 20 },
            subtotal: { type: 'number' },
            taxAmount: { type: 'number' },
            tipAmount: { type: 'number' },
            totalAmount: { type: 'number' },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            paymentMethod: { type: 'string', maxLength: 50 },
            lastFourDigits: { type: 'string', maxLength: 4 },
            invoiceNumber: { type: 'string', maxLength: 100 },
            poNumber: { type: 'string', maxLength: 100 },
            lineItems: { type: 'array' },
            notes: { type: 'string' },
            customFields: { type: 'object' },
          },
        },
      },
    },
    (request, reply) => controller.updateMetadata(request as AuthenticatedRequest, reply)
  )

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
      },
    },
    (request, reply) => controller.getMetadata(request as AuthenticatedRequest, reply)
  )

  // Add tag to receipt
  fastify.post(
    '/:workspaceId/receipts/:receiptId/tags',
    {
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
      },
    },
    (request, reply) => controller.addTag(request as AuthenticatedRequest, reply)
  )

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
      },
    },
    (request, reply) => controller.removeTag(request as AuthenticatedRequest, reply)
  )

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
      },
    },
    (request, reply) => controller.getStats(request as AuthenticatedRequest, reply)
  )
}
