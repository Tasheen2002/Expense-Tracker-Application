import { FastifyInstance } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { NotificationController } from "../controllers/notification.controller";

export function registerNotificationRoutes(
  fastify: FastifyInstance,
  controller: NotificationController,
) {
  const opts = { preHandler: [fastify.authenticate] };

  // Get all notifications for current user
  fastify.get(
    "/workspaces/:workspaceId/notifications",
    {
      ...opts,
      schema: {
        tags: ["Notification"],
        summary: "Get notifications",
        description:
          "Retrieve all notifications for the authenticated user in a workspace",
        params: {
          type: "object",
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
          required: ["workspaceId"],
        },
        querystring: {
          type: "object",
          properties: {
            limit: {
              type: "string",
              description: "Number of notifications to return (max 100)",
            },
            offset: {
              type: "string",
              description: "Number of notifications to skip",
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              statusCode: { type: "number" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  notifications: { type: "array" },
                  unreadCount: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.getNotifications(request as AuthenticatedRequest, reply),
  );

  // Mark single notification as read
  fastify.patch(
    "/workspaces/:workspaceId/notifications/:notificationId/read",
    {
      ...opts,
      schema: {
        tags: ["Notification"],
        summary: "Mark notification as read",
        description: "Mark a specific notification as read",
        params: {
          type: "object",
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            notificationId: { type: "string", format: "uuid" },
          },
          required: ["workspaceId", "notificationId"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              statusCode: { type: "number" },
              message: { type: "string" },
              data: { type: "object" },
            },
          },
        },
      },
    },
    (request, reply) => controller.markAsRead(request as AuthenticatedRequest, reply),
  );

  // Mark all notifications as read
  fastify.patch(
    "/workspaces/:workspaceId/notifications/read-all",
    {
      ...opts,
      schema: {
        tags: ["Notification"],
        summary: "Mark all notifications as read",
        description:
          "Mark all notifications as read for the authenticated user in a workspace",
        params: {
          type: "object",
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
          required: ["workspaceId"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              statusCode: { type: "number" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    (request, reply) => controller.markAllAsRead(request as AuthenticatedRequest, reply),
  );

  // Get notification preferences
  fastify.get(
    "/workspaces/:workspaceId/notifications/preferences",
    {
      ...opts,
      schema: {
        tags: ["Notification"],
        summary: "Get notification preferences",
        description: "Get notification preferences for the authenticated user",
        params: {
          type: "object",
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
          required: ["workspaceId"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              statusCode: { type: "number" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  emailEnabled: { type: "boolean" },
                  inAppEnabled: { type: "boolean" },
                  pushEnabled: { type: "boolean" },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.getPreferences(request as AuthenticatedRequest, reply),
  );

  // Update notification preferences
  fastify.patch(
    "/workspaces/:workspaceId/notifications/preferences",
    {
      ...opts,
      schema: {
        tags: ["Notification"],
        summary: "Update notification preferences",
        description:
          "Update notification preferences for the authenticated user",
        params: {
          type: "object",
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
          required: ["workspaceId"],
        },
        body: {
          type: "object",
          properties: {
            email: {
              type: "boolean",
              description: "Enable email notifications",
            },
            inApp: {
              type: "boolean",
              description: "Enable in-app notifications",
            },
            push: { type: "boolean", description: "Enable push notifications" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              statusCode: { type: "number" },
              message: { type: "string" },
              data: { type: "object" },
            },
          },
        },
      },
    },
    (request, reply) => controller.updatePreferences(request as AuthenticatedRequest, reply),
  );
}
