import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TemplateController } from '../controllers/template.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';
import { validateBody, validateQuery } from '../validation/validator';
import {
  createTemplateSchema,
  updateTemplateSchema,
  getActiveTemplateSchema,
  templateParamsJsonSchema,
  createTemplateBodyJsonSchema,
  updateTemplateBodyJsonSchema,
  getActiveTemplateQueryJsonSchema,
  notificationTemplateEnvelopeJsonSchema,
} from '../validation/template.schema';

export async function registerTemplateRoutes(
  fastify: FastifyInstance,
  controller: TemplateController
): Promise<void> {
  const templateWorkspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const query = request.query as any;
    const body = request.body as any;
    const workspaceId = params?.workspaceId || query?.workspaceId || body?.workspaceId;

    if (workspaceId) {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!UUID_REGEX.test(workspaceId)) {
        return reply.status(400).send({
          success: false,
          statusCode: 400,
          message: 'Invalid workspace ID format',
        });
      }

      const originalParams = request.params as any;
      request.params = { ...originalParams, workspaceId };
      try {
        await workspaceAuthorizationMiddleware(
          request as AuthenticatedRequest,
          reply,
          request.server.prisma
        );
        if (reply.sent) return;
        await RolePermissions.ADMIN_LEVEL(request, reply);
      } finally {
        request.params = originalParams;
      }
    }
  };

  // Create notification template
  fastify.post(
    '/admin/notification-templates',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(createTemplateSchema),
        templateWorkspaceAuth,
      ],
      schema: {
        tags: ['Notification Templates'],
        description: 'Create a new notification template',
        security: [{ bearerAuth: [] }],
        body: createTemplateBodyJsonSchema,
        response: {
          201: notificationTemplateEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.createTemplate(request as AuthenticatedRequest, reply)
  );

  // Get template by ID
  fastify.get(
    '/admin/notification-templates/:templateId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [templateWorkspaceAuth],
      schema: {
        tags: ['Notification Templates'],
        description: 'Get a notification template by ID',
        security: [{ bearerAuth: [] }],
        params: templateParamsJsonSchema,
        response: {
          200: notificationTemplateEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getTemplateById(request as AuthenticatedRequest, reply)
  );

  // Get active template by type and channel
  fastify.get(
    '/admin/notification-templates/active',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(getActiveTemplateSchema),
        templateWorkspaceAuth,
      ],
      schema: {
        tags: ['Notification Templates'],
        description: 'Get the active template for a specific type and channel',
        security: [{ bearerAuth: [] }],
        querystring: getActiveTemplateQueryJsonSchema,
        response: {
          200: notificationTemplateEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getActiveTemplate(request as AuthenticatedRequest, reply)
  );

  // Update template
  fastify.patch(
    '/admin/notification-templates/:templateId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(updateTemplateSchema),
        templateWorkspaceAuth,
      ],
      schema: {
        tags: ['Notification Templates'],
        description: 'Update a notification template',
        security: [{ bearerAuth: [] }],
        params: templateParamsJsonSchema,
        body: updateTemplateBodyJsonSchema,
        response: {
          200: notificationTemplateEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.updateTemplate(request as AuthenticatedRequest, reply)
  );

  // Activate template
  fastify.patch(
    '/admin/notification-templates/:templateId/activate',
    {
      onRequest: [fastify.authenticate],
      preHandler: [templateWorkspaceAuth],
      schema: {
        tags: ['Notification Templates'],
        description: 'Activate a notification template',
        security: [{ bearerAuth: [] }],
        params: templateParamsJsonSchema,
        response: {
          200: notificationTemplateEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.activateTemplate(request as AuthenticatedRequest, reply)
  );

  // Deactivate template
  fastify.patch(
    '/admin/notification-templates/:templateId/deactivate',
    {
      onRequest: [fastify.authenticate],
      preHandler: [templateWorkspaceAuth],
      schema: {
        tags: ['Notification Templates'],
        description: 'Deactivate a notification template',
        security: [{ bearerAuth: [] }],
        params: templateParamsJsonSchema,
        response: {
          200: notificationTemplateEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.deactivateTemplate(request as AuthenticatedRequest, reply)
  );
}

