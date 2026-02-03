import { FastifyInstance } from "fastify";
import { ExemptionController } from "../controllers/exemption.controller";

export async function exemptionRoutes(
  fastify: FastifyInstance,
  controller: ExemptionController,
) {
  // Request exemption
  fastify.post(
    "/:workspaceId/exemptions",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "Request a policy exemption",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["policyId", "userId", "reason", "startDate", "endDate"],
          properties: {
            policyId: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            reason: { type: "string", minLength: 10, maxLength: 1000 },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            scope: {
              type: "object",
              properties: {
                categoryIds: {
                  type: "array",
                  items: { type: "string", format: "uuid" },
                },
                maxAmount: { type: "number", minimum: 0 },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.requestExemption(request as any, reply),
  );

  // List exemptions
  fastify.get(
    "/:workspaceId/exemptions",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "List policy exemptions in workspace",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["PENDING", "APPROVED", "REJECTED", "EXPIRED"],
            },
            userId: { type: "string", format: "uuid" },
            policyId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.listExemptions(request as any, reply),
  );

  // Check active exemption
  fastify.get(
    "/:workspaceId/exemptions/active",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "Check if user has active exemption for a policy",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        querystring: {
          type: "object",
          required: ["userId", "policyId"],
          properties: {
            userId: { type: "string", format: "uuid" },
            policyId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.checkActiveExemption(request as any, reply),
  );

  // Get exemption
  fastify.get(
    "/:workspaceId/exemptions/:exemptionId",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "Get policy exemption by ID",
        params: {
          type: "object",
          required: ["workspaceId", "exemptionId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            exemptionId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.getExemption(request as any, reply),
  );

  // Approve exemption
  fastify.post(
    "/:workspaceId/exemptions/:exemptionId/approve",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "Approve a policy exemption request",
        params: {
          type: "object",
          required: ["workspaceId", "exemptionId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            exemptionId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            approvalNote: { type: "string", maxLength: 500 },
          },
        },
      },
    },
    (request, reply) => controller.approveExemption(request as any, reply),
  );

  // Reject exemption
  fastify.post(
    "/:workspaceId/exemptions/:exemptionId/reject",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "Reject a policy exemption request",
        params: {
          type: "object",
          required: ["workspaceId", "exemptionId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            exemptionId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["rejectionReason"],
          properties: {
            rejectionReason: { type: "string", minLength: 10, maxLength: 1000 },
          },
        },
      },
    },
    (request, reply) => controller.rejectExemption(request as any, reply),
  );
}
