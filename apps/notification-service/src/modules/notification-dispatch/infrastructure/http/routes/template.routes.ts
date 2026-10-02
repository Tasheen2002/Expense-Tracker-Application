import { notificationReadRateLimit, notificationWriteRateLimit } from '@shared/http/notification-rate-limits';
import { WorkspaceId } from '../../../domain/value-objects';
import { TemplateNotFoundByIdError, TemplateAccessDeniedError } from '../../../domain/errors/notification.errors';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TemplateController } from '../controllers/template.controller';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';
import { validateBody, validateQuery, validateParams } from '../validation/validator';
import {
  createTemplateSchema,
  updateTemplateSchema,
  getActiveTemplateSchema,
  templateParamsJsonSchema,
  templateParamsSchema,
  createTemplateBodyJsonSchema,
  updateTemplateBodyJsonSchema,
  getActiveTemplateQueryJsonSchema,
  notificationTemplateEnvelopeJsonSchema,
} from '../validation/template.schema';

export async function registerTemplateRoutes(
  fastify: FastifyInstance,
  controller: Pick<TemplateController, 'createTemplate' | 'getTemplateById' | 'getActiveTemplate' | 'updateTemplate' | 'activateTemplate' | 'deactivateTemplate'>
): Promise<void> {
  const templateWorkspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as { templateId?: string };
    let workspaceId: string | undefined;
    if (params.templateId) {
      const template = await request.server.prisma.notificationTemplate.findUnique({
        where: { id: params.templateId }, select: { workspaceId: true },
      });
      if (!template) throw new TemplateNotFoundByIdError(params.templateId);
      workspaceId = template.workspaceId ?? undefined;
    } else {
      workspaceId = (request.body as { workspaceId?: string } | undefined)?.workspaceId
        ?? (request.query as { workspaceId?: string })?.workspaceId;
    }
    // Global templates have no workspace role model. Fail closed on these public
    // management routes; delivery still reads global fallback templates internally.
    if (!workspaceId) throw new TemplateAccessDeniedError();
    const workspace = WorkspaceId.fromString(workspaceId);
    const originalParams = request.params;
    request.params = { ...params, workspaceId: workspace.getValue() };
    try {
      await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, request.server.prisma);
      if (reply.sent) return;
      await RolePermissions.ADMIN_LEVEL(request, reply);
    } finally { request.params = originalParams; }
  };
  // Create notification template
  fastify.post(
    '/admin/notification-templates',
    {
      onRequest: [fastify.authenticate, notificationWriteRateLimit],
      preValidation: [validateBody(createTemplateSchema)],
      preHandler: [templateWorkspaceAuth],
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
      onRequest: [fastify.authenticate, notificationReadRateLimit],
      preValidation: [validateParams(templateParamsSchema)],
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
      onRequest: [fastify.authenticate, notificationReadRateLimit],
      preValidation: [validateQuery(getActiveTemplateSchema)],
      preHandler: [templateWorkspaceAuth],
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
      onRequest: [fastify.authenticate, notificationWriteRateLimit],
      preValidation: [validateBody(updateTemplateSchema), validateParams(templateParamsSchema)],
      preHandler: [templateWorkspaceAuth],
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
      onRequest: [fastify.authenticate, notificationWriteRateLimit],
      preValidation: [validateParams(templateParamsSchema)],
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
      onRequest: [fastify.authenticate, notificationWriteRateLimit],
      preValidation: [validateParams(templateParamsSchema)],
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
