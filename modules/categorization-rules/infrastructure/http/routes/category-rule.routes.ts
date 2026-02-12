import { FastifyInstance } from "fastify";
import { CategoryRuleController } from "../controllers/category-rule.controller";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";

export async function categoryRuleRoutes(
  fastify: FastifyInstance,
  controller: CategoryRuleController,
) {
  // Create category rule
  fastify.post(
    "/:workspaceId/rules",
    {
      schema: {
        tags: ["Categorization Rules - Rules"],
        description: "Create a new category rule",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: [
            "name",
            "conditionType",
            "conditionValue",
            "targetCategoryId",
          ],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 100 },
            description: { type: "string", maxLength: 500 },
            priority: { type: "number", minimum: 0 },
            conditionType: {
              type: "string",
              enum: [
                "MERCHANT_CONTAINS",
                "MERCHANT_EQUALS",
                "AMOUNT_GREATER_THAN",
                "AMOUNT_LESS_THAN",
                "AMOUNT_EQUALS",
                "DESCRIPTION_CONTAINS",
                "PAYMENT_METHOD_EQUALS",
              ],
            },
            conditionValue: { type: "string", minLength: 1, maxLength: 255 },
            targetCategoryId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.createRule(request as AuthenticatedRequest, reply),
  );

  // List category rules
  fastify.get(
    "/:workspaceId/rules",
    {
      schema: {
        tags: ["Categorization Rules - Rules"],
        description: "List all category rules in workspace",
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
            limit: { type: "string", pattern: "^[0-9]+$" },
            offset: { type: "string", pattern: "^[0-9]+$" },
          },
        },
      },
    },
    (request, reply) => controller.listRules(request as AuthenticatedRequest, reply),
  );

  // Get single category rule
  fastify.get(
    "/:workspaceId/rules/:ruleId",
    {
      schema: {
        tags: ["Categorization Rules - Rules"],
        description: "Get a specific category rule",
        params: {
          type: "object",
          required: ["workspaceId", "ruleId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            ruleId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.getRuleById(request as AuthenticatedRequest, reply),
  );

  // Update category rule
  fastify.patch(
    "/:workspaceId/rules/:ruleId",
    {
      schema: {
        tags: ["Categorization Rules - Rules"],
        description: "Update a category rule",
        params: {
          type: "object",
          required: ["workspaceId", "ruleId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            ruleId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1, maxLength: 100 },
            description: { type: ["string", "null"], maxLength: 500 },
            priority: { type: "number", minimum: 0 },
            conditionType: {
              type: "string",
              enum: [
                "MERCHANT_CONTAINS",
                "MERCHANT_EQUALS",
                "AMOUNT_GREATER_THAN",
                "AMOUNT_LESS_THAN",
                "AMOUNT_EQUALS",
                "DESCRIPTION_CONTAINS",
                "PAYMENT_METHOD_EQUALS",
              ],
            },
            conditionValue: { type: "string", minLength: 1, maxLength: 255 },
            targetCategoryId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.updateRule(request as AuthenticatedRequest, reply),
  );

  // Delete category rule
  fastify.delete(
    "/:workspaceId/rules/:ruleId",
    {
      schema: {
        tags: ["Categorization Rules - Rules"],
        description: "Delete a category rule",
        params: {
          type: "object",
          required: ["workspaceId", "ruleId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            ruleId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.deleteRule(request as AuthenticatedRequest, reply),
  );

  // Activate category rule
  fastify.patch(
    "/:workspaceId/rules/:ruleId/activate",
    {
      schema: {
        tags: ["Categorization Rules - Rules"],
        description: "Activate a category rule",
        params: {
          type: "object",
          required: ["workspaceId", "ruleId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            ruleId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.activateRule(request as AuthenticatedRequest, reply),
  );

  // Deactivate category rule
  fastify.patch(
    "/:workspaceId/rules/:ruleId/deactivate",
    {
      schema: {
        tags: ["Categorization Rules - Rules"],
        description: "Deactivate a category rule",
        params: {
          type: "object",
          required: ["workspaceId", "ruleId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            ruleId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.deactivateRule(request as AuthenticatedRequest, reply),
  );

  // Get rule executions
  fastify.get(
    "/:workspaceId/rules/:ruleId/executions",
    {
      schema: {
        tags: ["Categorization Rules - Rules"],
        description: "Get execution history for a category rule",
        params: {
          type: "object",
          required: ["workspaceId", "ruleId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            ruleId: { type: "string", format: "uuid" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            limit: { type: "string", pattern: "^[0-9]+$" },
            offset: { type: "string", pattern: "^[0-9]+$" },
          },
        },
      },
    },
    (request, reply) => controller.getRuleExecutions(request as AuthenticatedRequest, reply),
  );
}
