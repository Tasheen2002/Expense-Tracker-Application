import { FastifyInstance } from "fastify";
import { PolicyController } from "../controllers/policy.controller";

export async function policyRoutes(
  fastify: FastifyInstance,
  controller: PolicyController,
) {
  // Create policy
  fastify.post(
    "/:workspaceId/policies",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "Create a new expense policy",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["name", "policyType", "severity", "configuration"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 100 },
            description: { type: "string", maxLength: 500 },
            policyType: {
              type: "string",
              enum: [
                "SPENDING_LIMIT",
                "DAILY_LIMIT",
                "WEEKLY_LIMIT",
                "MONTHLY_LIMIT",
                "CATEGORY_RESTRICTION",
                "MERCHANT_BLACKLIST",
                "TIME_RESTRICTION",
                "RECEIPT_REQUIRED",
                "DESCRIPTION_REQUIRED",
                "APPROVAL_REQUIRED",
              ],
            },
            severity: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            },
            configuration: { type: "object" },
            priority: { type: "integer", minimum: 0, maximum: 1000 },
          },
        },
      },
    },
    (request, reply) => controller.createPolicy(request as any, reply),
  );

  // List policies
  fastify.get(
    "/:workspaceId/policies",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "List all expense policies in workspace",
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
            activeOnly: { type: "string", enum: ["true", "false"] },
            policyType: {
              type: "string",
              enum: [
                "SPENDING_LIMIT",
                "DAILY_LIMIT",
                "WEEKLY_LIMIT",
                "MONTHLY_LIMIT",
                "CATEGORY_RESTRICTION",
                "MERCHANT_BLACKLIST",
                "TIME_RESTRICTION",
                "RECEIPT_REQUIRED",
                "DESCRIPTION_REQUIRED",
                "APPROVAL_REQUIRED",
              ],
            },
          },
        },
      },
    },
    (request, reply) => controller.listPolicies(request as any, reply),
  );

  // Get policy
  fastify.get(
    "/:workspaceId/policies/:policyId",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "Get expense policy by ID",
        params: {
          type: "object",
          required: ["workspaceId", "policyId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            policyId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.getPolicy(request as any, reply),
  );

  // Update policy
  fastify.patch(
    "/:workspaceId/policies/:policyId",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "Update expense policy",
        params: {
          type: "object",
          required: ["workspaceId", "policyId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            policyId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1, maxLength: 100 },
            description: { type: "string", maxLength: 500 },
            severity: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            },
            configuration: { type: "object" },
            priority: { type: "integer", minimum: 0, maximum: 1000 },
          },
        },
      },
    },
    (request, reply) => controller.updatePolicy(request as any, reply),
  );

  // Delete policy
  fastify.delete(
    "/:workspaceId/policies/:policyId",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "Delete expense policy",
        params: {
          type: "object",
          required: ["workspaceId", "policyId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            policyId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.deletePolicy(request as any, reply),
  );

  // Activate policy
  fastify.post(
    "/:workspaceId/policies/:policyId/activate",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "Activate expense policy",
        params: {
          type: "object",
          required: ["workspaceId", "policyId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            policyId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.activatePolicy(request as any, reply),
  );

  // Deactivate policy
  fastify.post(
    "/:workspaceId/policies/:policyId/deactivate",
    {
      schema: {
        tags: ["Policy Controls"],
        description: "Deactivate expense policy",
        params: {
          type: "object",
          required: ["workspaceId", "policyId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            policyId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.deactivatePolicy(request as any, reply),
  );
}
