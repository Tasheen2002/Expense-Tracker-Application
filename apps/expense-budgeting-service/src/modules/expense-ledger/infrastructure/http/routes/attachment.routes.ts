import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AttachmentController } from '../controllers/attachment.controller';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import {
  validateBody,
  validateQuery,
} from '../validation/validator';
import {
  paginationQuerySchema,
  paginationQueryJsonSchema,
} from '../validation/common.schema';
import {
  createAttachmentSchema,
  createAttachmentBodyJsonSchema,
  workspaceExpenseParamsJsonSchema,
  attachmentParamsJsonSchema,
  attachmentEnvelopeJsonSchema,
  listAttachmentsEnvelopeJsonSchema,
} from '../validation/attachment.schema';
import { noContentResponse } from '@shared/http/response-schemas';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function attachmentRoutes(
  fastify: FastifyInstance,
  controller: AttachmentController,
): Promise<void> {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(
      request as AuthenticatedRequest,
      reply,
      request.server.prisma
    );
  };

  fastify.addHook('preHandler', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create attachment
  fastify.post(
    '/workspaces/:workspaceId/expenses/:expenseId/attachments',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(createAttachmentSchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Attachment'],
        description: 'Register metadata for an existing expense attachment. This endpoint does not upload or verify file contents.',
        security: [{ bearerAuth: [] }],
        params: workspaceExpenseParamsJsonSchema,
        body: createAttachmentBodyJsonSchema,
        response: {
          201: attachmentEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Attachment'],
        description: 'Get attachment by ID',
        security: [{ bearerAuth: [] }],
        params: attachmentParamsJsonSchema,
        response: {
          200: attachmentEnvelopeJsonSchema,
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
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        validateQuery(paginationQuerySchema),
      ],
      schema: {
        tags: ['Attachment'],
        description: 'List all attachments for an expense',
        security: [{ bearerAuth: [] }],
        params: workspaceExpenseParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: listAttachmentsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listAttachments(request as AuthenticatedRequest, reply)
  );
}
