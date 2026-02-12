import { FastifyInstance } from "fastify";
import { PreferenceController } from "../controllers/preference.controller";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";

export function registerPreferenceRoutes(
  fastify: FastifyInstance,
  controller: PreferenceController,
) {
  const opts = { preHandler: [fastify.authenticate] };

  // Get user preferences for a workspace
  fastify.get(
    "/workspaces/:workspaceId/notification-preferences",
    {
      ...opts,
      schema: {
        tags: ["Notification Preferences"],
        description:
          "Get notification preferences for the current user in a workspace",
        params: {
          type: "object",
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
          required: ["workspaceId"],
        },
      },
    },
    (request, reply) => controller.getPreferences(request as AuthenticatedRequest, reply),
  );

  // Update global notification preferences
  fastify.patch(
    "/workspaces/:workspaceId/notification-preferences",
    {
      ...opts,
      schema: {
        tags: ["Notification Preferences"],
        description: "Update global notification preferences",
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
            email: { type: "boolean" },
            inApp: { type: "boolean" },
            push: { type: "boolean" },
          },
        },
      },
    },
    (request, reply) =>
      controller.updateGlobalPreferences(request as AuthenticatedRequest, reply),
  );

  // Update notification preference for a specific type
  fastify.patch(
    "/workspaces/:workspaceId/notification-preferences/:type",
    {
      ...opts,
      schema: {
        tags: ["Notification Preferences"],
        description:
          "Update notification preferences for a specific notification type",
        params: {
          type: "object",
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            type: {
              type: "string",
              enum: [
                "EXPENSE_APPROVED",
                "EXPENSE_REJECTED",
                "APPROVAL_REQUIRED",
                "BUDGET_ALERT",
                "INVITATION",
                "SYSTEM_ALERT",
              ],
            },
          },
          required: ["workspaceId", "type"],
        },
        body: {
          type: "object",
          properties: {
            email: { type: "boolean" },
            inApp: { type: "boolean" },
            push: { type: "boolean" },
          },
        },
      },
    },
    (request, reply) => controller.updateTypePreference(request as AuthenticatedRequest, reply),
  );

  // Check if a channel is enabled for a notification type
  fastify.get(
    "/workspaces/:workspaceId/notification-preferences/check",
    {
      ...opts,
      schema: {
        tags: ["Notification Preferences"],
        description:
          "Check if a specific channel is enabled for a notification type",
        params: {
          type: "object",
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
          required: ["workspaceId"],
        },
        querystring: {
          type: "object",
          required: ["type", "channel"],
          properties: {
            type: {
              type: "string",
              enum: [
                "EXPENSE_APPROVED",
                "EXPENSE_REJECTED",
                "APPROVAL_REQUIRED",
                "BUDGET_ALERT",
                "INVITATION",
                "SYSTEM_ALERT",
              ],
            },
            channel: {
              type: "string",
              enum: ["email", "inApp", "push"],
            },
          },
        },
      },
    },
    (request, reply) => controller.checkChannelEnabled(request as AuthenticatedRequest, reply),
  );
}
