import { FastifyInstance } from "fastify";
import { TemplateController } from "../controllers/template.controller";

export function registerTemplateRoutes(
  fastify: FastifyInstance,
  controller: TemplateController,
) {
  const opts = { preHandler: [fastify.authenticate] };

  // Create notification template
  fastify.post(
    "/admin/notification-templates",
    {
      ...opts,
      schema: {
        tags: ["Notification Templates"],
        description: "Create a new notification template",
        body: {
          type: "object",
          required: [
            "name",
            "type",
            "channel",
            "subjectTemplate",
            "bodyTemplate",
          ],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            name: { type: "string", minLength: 1, maxLength: 100 },
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
              enum: ["EMAIL", "IN_APP", "PUSH"],
            },
            subjectTemplate: { type: "string", minLength: 1, maxLength: 255 },
            bodyTemplate: { type: "string", minLength: 1 },
          },
        },
      },
    },
    (request, reply) => controller.createTemplate(request as any, reply),
  );

  // Get template by ID
  fastify.get(
    "/admin/notification-templates/:templateId",
    {
      ...opts,
      schema: {
        tags: ["Notification Templates"],
        description: "Get a notification template by ID",
        params: {
          type: "object",
          properties: {
            templateId: { type: "string", format: "uuid" },
          },
          required: ["templateId"],
        },
      },
    },
    (request, reply) => controller.getTemplateById(request as any, reply),
  );

  // Get active template by type and channel
  fastify.get(
    "/admin/notification-templates/active",
    {
      ...opts,
      schema: {
        tags: ["Notification Templates"],
        description: "Get the active template for a specific type and channel",
        querystring: {
          type: "object",
          required: ["type", "channel"],
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
            channel: {
              type: "string",
              enum: ["EMAIL", "IN_APP", "PUSH"],
            },
          },
        },
      },
    },
    (request, reply) => controller.getActiveTemplate(request as any, reply),
  );

  // Update template
  fastify.patch(
    "/admin/notification-templates/:templateId",
    {
      ...opts,
      schema: {
        tags: ["Notification Templates"],
        description: "Update a notification template",
        params: {
          type: "object",
          properties: {
            templateId: { type: "string", format: "uuid" },
          },
          required: ["templateId"],
        },
        body: {
          type: "object",
          properties: {
            subjectTemplate: { type: "string", maxLength: 255 },
            bodyTemplate: { type: "string" },
          },
        },
      },
    },
    (request, reply) => controller.updateTemplate(request as any, reply),
  );

  // Activate template
  fastify.patch(
    "/admin/notification-templates/:templateId/activate",
    {
      ...opts,
      schema: {
        tags: ["Notification Templates"],
        description: "Activate a notification template",
        params: {
          type: "object",
          properties: {
            templateId: { type: "string", format: "uuid" },
          },
          required: ["templateId"],
        },
      },
    },
    (request, reply) => controller.activateTemplate(request as any, reply),
  );

  // Deactivate template
  fastify.patch(
    "/admin/notification-templates/:templateId/deactivate",
    {
      ...opts,
      schema: {
        tags: ["Notification Templates"],
        description: "Deactivate a notification template",
        params: {
          type: "object",
          properties: {
            templateId: { type: "string", format: "uuid" },
          },
          required: ["templateId"],
        },
      },
    },
    (request, reply) => controller.deactivateTemplate(request as any, reply),
  );
}
