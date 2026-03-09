import { FastifyInstance } from 'fastify';
import { AttachmentController } from '../controllers/attachment.controller';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '../../../../../apps/api/src/shared/middleware/rate-limiter.middleware';
import { validateBody } from '../validation/validator';
import { createAttachmentSchema } from '../validation/attachment.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function attachmentRoutes(
  fastify: FastifyInstance,
  controller: AttachmentController
) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });
  // Create attachment
  fastify.post(
    '/workspaces/:workspaceId/expenses/:expenseId/attachments',
    {
      preValidation: [validateBody(createAttachmentSchema)],
      schema: {
        tags: ['Attachment'],
        description: 'Upload and link attachment to expense',
        params: {
          type: 'object',
          required: ['workspaceId', 'expenseId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            expenseId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['fileName', 'filePath', 'fileSize', 'mimeType'],
          additionalProperties: false,
          properties: {
            fileName: { type: 'string', minLength: 1, maxLength: 255 },
            filePath: { type: 'string', minLength: 1, maxLength: 500 },
            fileSize: { type: 'number', minimum: 1, maximum: 10485760 }, // 10MB max
            mimeType: {
              type: 'string',
              enum: [
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/gif',
                'image/webp',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/csv',
                'text/plain',
              ],
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  attachmentId: { type: 'string' },
                  expenseId: { type: 'string' },
                  fileName: { type: 'string' },
                  filePath: { type: 'string' },
                  fileSize: { type: 'number' },
                  mimeType: { type: 'string' },
                  uploadedBy: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.createAttachment(request as AuthenticatedRequest, reply)
  );

  // Delete attachment
  fastify.delete(
    '/workspaces/:workspaceId/expenses/:expenseId/attachments/:attachmentId',
    {
      schema: {
        tags: ['Attachment'],
        description: 'Delete an attachment',
        params: {
          type: 'object',
          required: ['workspaceId', 'expenseId', 'attachmentId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            expenseId: { type: 'string', format: 'uuid' },
            attachmentId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.deleteAttachment(request as AuthenticatedRequest, reply)
  );

  // Get attachment by ID
  fastify.get(
    '/workspaces/:workspaceId/expenses/:expenseId/attachments/:attachmentId',
    {
      schema: {
        tags: ['Attachment'],
        description: 'Get attachment by ID',
        params: {
          type: 'object',
          required: ['workspaceId', 'expenseId', 'attachmentId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            expenseId: { type: 'string', format: 'uuid' },
            attachmentId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  attachmentId: { type: 'string' },
                  expenseId: { type: 'string' },
                  fileName: { type: 'string' },
                  filePath: { type: 'string' },
                  fileSize: { type: 'number' },
                  mimeType: { type: 'string' },
                  uploadedBy: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.getAttachment(request as AuthenticatedRequest, reply)
  );

  // List attachments for an expense
  fastify.get(
    '/workspaces/:workspaceId/expenses/:expenseId/attachments',
    {
      schema: {
        tags: ['Attachment'],
        description: 'List all attachments for an expense',
        params: {
          type: 'object',
          required: ['workspaceId', 'expenseId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            expenseId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        attachmentId: { type: 'string' },
                        expenseId: { type: 'string' },
                        fileName: { type: 'string' },
                        filePath: { type: 'string' },
                        fileSize: { type: 'number' },
                        mimeType: { type: 'string' },
                        uploadedBy: { type: 'string' },
                        createdAt: { type: 'string' },
                      },
                    },
                  },
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
              },
            },
          },
        },
      },
    },
    (request, reply) =>
      controller.listAttachments(request as AuthenticatedRequest, reply)
  );
}
