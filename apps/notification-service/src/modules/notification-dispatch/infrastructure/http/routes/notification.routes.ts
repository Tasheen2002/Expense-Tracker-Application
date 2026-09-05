import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { NotificationController } from '../controllers/notification.controller';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import { validateQuery } from '../validation/validator';
import {
  listNotificationsSchema,
  workspaceParamsJsonSchema,
  listNotificationsQueryJsonSchema,
  notificationListEnvelopeJsonSchema,
  unreadNotificationListEnvelopeJsonSchema,
  markAsReadParamsJsonSchema,
  baseResponseEnvelopeJsonSchema,
} from '../validation/notification.schema';

export async function registerNotificationRoutes(
  fastify: FastifyInstance,
  controller: NotificationController
): Promise<void> {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(
      request as AuthenticatedRequest,
      reply,
      request.server.prisma
    );
  };

  // Get all notifications for current user
  fastify.get(
    '/workspaces/:workspaceId/notifications',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateQuery(listNotificationsSchema),
        workspaceAuth,
      ],
      schema: {
        tags: ['Notification'],
        summary: 'Get notifications',
        description: 'Retrieve all notifications for the authenticated user in a workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: listNotificationsQueryJsonSchema,
        response: {
          200: notificationListEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getNotifications(request as AuthenticatedRequest, reply)
  );

  // Get only unread notifications
  fastify.get(
    '/workspaces/:workspaceId/notifications/unread',
    {
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Notification'],
        summary: 'Get unread notifications',
        description: 'Retrieve all unread notifications for the authenticated user in a workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        response: {
          200: unreadNotificationListEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getUnreadNotifications(request as AuthenticatedRequest, reply)
  );

  // Mark single notification as read
  fastify.patch(
    '/workspaces/:workspaceId/notifications/:notificationId/read',
    {
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Notification'],
        summary: 'Mark notification as read',
        description: 'Mark a specific notification as read',
        security: [{ bearerAuth: [] }],
        params: markAsReadParamsJsonSchema,
        response: {
          200: baseResponseEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.markAsRead(request as AuthenticatedRequest, reply)
  );

  // Mark all notifications as read
  fastify.patch(
    '/workspaces/:workspaceId/notifications/read-all',
    {
      onRequest: [fastify.authenticate],
      preHandler: [workspaceAuth],
      schema: {
        tags: ['Notification'],
        summary: 'Mark all notifications as read',
        description: 'Mark all notifications as read for the authenticated user in a workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        response: {
          200: baseResponseEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.markAllAsRead(request as AuthenticatedRequest, reply)
  );
}

