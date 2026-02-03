import { FastifyInstance } from "fastify";
import { ViolationController } from "../controllers/violation.controller";

export async function violationRoutes(
  fastify: FastifyInstance,
  controller: ViolationController,
) {
  // List violations
  fastify.get(
    "/:workspaceId/violations",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "List policy violations in workspace",
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
              enum: [
                "PENDING",
                "ACKNOWLEDGED",
                "RESOLVED",
                "EXEMPTED",
                "OVERRIDDEN",
              ],
            },
            userId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
            policyId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.listViolations(request as any, reply),
  );

  // Get violation stats
  fastify.get(
    "/:workspaceId/violations/stats",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "Get violation statistics for workspace",
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
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
          },
        },
      },
    },
    (request, reply) => controller.getViolationStats(request as any, reply),
  );

  // Get violation
  fastify.get(
    "/:workspaceId/violations/:violationId",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "Get policy violation by ID",
        params: {
          type: "object",
          required: ["workspaceId", "violationId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            violationId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.getViolation(request as any, reply),
  );

  // Acknowledge violation
  fastify.post(
    "/:workspaceId/violations/:violationId/acknowledge",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "Acknowledge a policy violation",
        params: {
          type: "object",
          required: ["workspaceId", "violationId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            violationId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            note: { type: "string", maxLength: 500 },
          },
        },
      },
    },
    (request, reply) => controller.acknowledgeViolation(request as any, reply),
  );

  // Resolve violation
  fastify.post(
    "/:workspaceId/violations/:violationId/resolve",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "Resolve a policy violation",
        params: {
          type: "object",
          required: ["workspaceId", "violationId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            violationId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            resolutionNote: { type: "string", maxLength: 500 },
          },
        },
      },
    },
    (request, reply) => controller.resolveViolation(request as any, reply),
  );

  // Exempt violation
  fastify.post(
    "/:workspaceId/violations/:violationId/exempt",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "Exempt a violation using an exemption",
        params: {
          type: "object",
          required: ["workspaceId", "violationId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            violationId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["exemptionId"],
          properties: {
            exemptionId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.exemptViolation(request as any, reply),
  );

  // Override violation
  fastify.post(
    "/:workspaceId/violations/:violationId/override",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "Override a policy violation",
        params: {
          type: "object",
          required: ["workspaceId", "violationId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            violationId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["overrideReason"],
          properties: {
            overrideReason: { type: "string", minLength: 10, maxLength: 500 },
          },
        },
      },
    },
    (request, reply) => controller.overrideViolation(request as any, reply),
  );
}
