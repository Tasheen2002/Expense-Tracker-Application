import { FastifyInstance } from 'fastify';
import { AttachmentController } from '../controllers/attachment.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import {
  validateBody,
  validateParams,
} from '../validation/validator';
import {
  createAttachmentSchema,
  createAttachmentBodyJsonSchema,
  workspaceExpenseParamsSchema,
  workspaceExpenseParamsJsonSchema,
  attachmentParamsSchema,
  attachmentParamsJsonSchema,
} from '../validation/attachment.schema';
import {
  successResponse,
  noContentResponse,
} from '@shared/http/response-schemas';

const attachmentSchema = {
  type: 'object',
  properties: {
    attachmentId: { type: 'string', format: 'uuid' },
    expenseId: { type: 'string', format: 'uuid' },
    fileName: { type: 'string' },
    filePath: { type: 'string' },
    fileSize: { type: 'number' },
    mimeType: { type: 'string' },
    uploadedBy: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

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
      preValidation: [
        validateParams(workspaceExpenseParamsSchema),
        validateBody(createAttachmentSchema),
      ],
      schema: {
        tags: ['Attachment'],
        description: 'Upload and link attachment to expense',
        security: [{ bearerAuth: [] }],
        params: workspaceExpenseParamsJsonSchema,
        body: createAttachmentBodyJsonSchema,
        response: {
          201: successResponse(attachmentSchema, 201),
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
      preValidation: [validateParams(attachmentParamsSchema)],
      schema: {
        tags: ['Attachment'],
        description: 'Delete an attachment',
        security: [{ bearerAuth: [] }],
        params: attachmentParamsJsonSchema,
        response: {
          204: noContentResponse,
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
      preValidation: [validateParams(attachmentParamsSchema)],
      schema: {
        tags: ['Attachment'],
        description: 'Get attachment by ID',
        security: [{ bearerAuth: [] }],
        params: attachmentParamsJsonSchema,
        response: {
          200: successResponse(attachmentSchema),
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
      preValidation: [validateParams(workspaceExpenseParamsSchema)],
      schema: {
        tags: ['Attachment'],
        description: 'List all attachments for an expense',
        security: [{ bearerAuth: [] }],
        params: workspaceExpenseParamsJsonSchema,
        response: {
          200: successResponse({
            type: 'object',
            required: ['items'],
            properties: {
              items: { type: 'array', items: attachmentSchema },
            },
          }),
        },
      },
    },
    (request, reply) =>
      controller.listAttachments(request as AuthenticatedRequest, reply)
  );
}
