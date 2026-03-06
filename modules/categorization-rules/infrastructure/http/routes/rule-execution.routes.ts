import { FastifyInstance } from "fastify";
import { RuleExecutionController } from "../controllers/rule-execution.controller";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";

export async function ruleExecutionRoutes(
  fastify: FastifyInstance,
  controller: RuleExecutionController,
) {
  // Evaluate rules for an expense
  fastify.post(
    "/:workspaceId/evaluate",
    {
      schema: {
        tags: ["Categorization Rules - Execution"],
        description: "Evaluate rules for an expense",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["expenseId", "expenseData"],
          properties: {
            expenseId: { type: "string", format: "uuid" },
            expenseData: {
              type: "object",
              required: ["amount"],
              properties: {
                merchant: { type: "string" },
                description: { type: "string" },
                amount: { type: "number", minimum: 0 },
                paymentMethod: { type: "string" },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.evaluateRules(request as AuthenticatedRequest, reply),
  );

  // Get executions by expense
  fastify.get(
    "/:workspaceId/executions/expense/:expenseId",
    {
      schema: {
        tags: ["Categorization Rules - Execution"],
        description: "Get rule executions for a specific expense",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) =>
      controller.getExecutionsByExpense(request as AuthenticatedRequest, reply),
  );

  // Get executions by workspace
  fastify.get(
    "/:workspaceId/executions",
    {
      schema: {
        tags: ["Categorization Rules - Execution"],
        description: "Get rule executions for workspace",
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
            limit: { type: "string", pattern: "^[0-9]+$" },
            offset: { type: "string", pattern: "^[0-9]+$" },
          },
        },
      },
    },
    (request, reply) =>
      controller.getExecutionsByWorkspace(request as AuthenticatedRequest, reply),
  );
}
