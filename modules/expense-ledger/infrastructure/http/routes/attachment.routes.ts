import { FastifyInstance } from "fastify";
import { AttachmentController } from "../controllers/attachment.controller";

export async function attachmentRoutes(
  fastify: FastifyInstance,
  controller: AttachmentController,
) {
  // Create attachment
  fastify.post(
    "/:workspaceId/expenses/:expenseId/attachments",
    {
      schema: {
        tags: ["Attachment"],
        description: "Upload and link attachment to expense",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["fileName", "filePath", "fileSize", "mimeType"],
          properties: {
            fileName: { type: "string", minLength: 1, maxLength: 255 },
            filePath: { type: "string", minLength: 1, maxLength: 500 },
            fileSize: { type: "number", minimum: 1, maximum: 10485760 }, // 10MB max
            mimeType: { type: "string", minLength: 1, maxLength: 100 },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              statusCode: { type: "number" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  attachmentId: { type: "string" },
                  expenseId: { type: "string" },
                  fileName: { type: "string" },
                  filePath: { type: "string" },
                  fileSize: { type: "number" },
                  mimeType: { type: "string" },
                  uploadedBy: { type: "string" },
                  createdAt: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.createAttachment(request as any, reply),
  );

  // Delete attachment
  fastify.delete(
    "/:workspaceId/expenses/:expenseId/attachments/:attachmentId",
    {
      schema: {
        tags: ["Attachment"],
        description: "Delete an attachment",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId", "attachmentId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
            attachmentId: { type: "string", format: "uuid" },
          },
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
    (request, reply) => controller.deleteAttachment(request as any, reply),
  );

  // Get attachment by ID
  fastify.get(
    "/:workspaceId/expenses/:expenseId/attachments/:attachmentId",
    {
      schema: {
        tags: ["Attachment"],
        description: "Get attachment by ID",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId", "attachmentId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
            attachmentId: { type: "string", format: "uuid" },
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
                  attachmentId: { type: "string" },
                  expenseId: { type: "string" },
                  fileName: { type: "string" },
                  filePath: { type: "string" },
                  fileSize: { type: "number" },
                  mimeType: { type: "string" },
                  uploadedBy: { type: "string" },
                  createdAt: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.getAttachment(request as any, reply),
  );

  // List attachments for an expense
  fastify.get(
    "/:workspaceId/expenses/:expenseId/attachments",
    {
      schema: {
        tags: ["Attachment"],
        description: "List all attachments for an expense",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
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
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        attachmentId: { type: "string" },
                        expenseId: { type: "string" },
                        fileName: { type: "string" },
                        filePath: { type: "string" },
                        fileSize: { type: "number" },
                        mimeType: { type: "string" },
                        uploadedBy: { type: "string" },
                        createdAt: { type: "string" },
                      },
                    },
                  },
                  pagination: {
                    type: "object",
                    properties: {
                      total: { type: "number" },
                      limit: { type: "number" },
                      offset: { type: "number" },
                      hasMore: { type: "boolean" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.listAttachments(request as any, reply),
  );
}
