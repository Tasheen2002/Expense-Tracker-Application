import { FastifyInstance } from "fastify";
import { BudgetPlanController } from "../controllers/budget-plan.controller";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";

export async function budgetPlanningRoutes(
  fastify: FastifyInstance,
  controller: BudgetPlanController,
) {
  // Create budget plan
  fastify.post(
    "/:workspaceId/budget-plans",
    {
      schema: {
        tags: ["Budget Planning - Plans"],
        description: "Create a new budget plan",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["name", "periodType", "startDate", "endDate"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 100 },
            description: { type: "string", maxLength: 500 },
            periodType: {
              type: "string",
              enum: ["MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"],
            },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
          },
        },
      },
    },
    (request, reply) => controller.create(request as AuthenticatedRequest, reply),
  );

  // List budget plans
  fastify.get(
    "/:workspaceId/budget-plans",
    {
      schema: {
        tags: ["Budget Planning - Plans"],
        description: "List all budget plans in workspace",
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
              enum: ["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"],
            },
            limit: { type: "string", pattern: "^[0-9]+$" },
            offset: { type: "string", pattern: "^[0-9]+$" },
          },
        },
      },
    },
    (request, reply) => controller.list(request as AuthenticatedRequest, reply),
  );

  // Get single budget plan
  fastify.get(
    "/:workspaceId/budget-plans/:id",
    {
      schema: {
        tags: ["Budget Planning - Plans"],
        description: "Get a specific budget plan",
        params: {
          type: "object",
          required: ["workspaceId", "id"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            id: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.get(request as AuthenticatedRequest, reply),
  );

  // Update budget plan
  fastify.patch(
    "/:workspaceId/budget-plans/:id",
    {
      schema: {
        tags: ["Budget Planning - Plans"],
        description: "Update a budget plan",
        params: {
          type: "object",
          required: ["workspaceId", "id"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            id: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1, maxLength: 100 },
            description: { type: ["string", "null"], maxLength: 500 },
          },
        },
      },
    },
    (request, reply) => controller.update(request as AuthenticatedRequest, reply),
  );

  // Delete budget plan
  fastify.delete(
    "/:workspaceId/budget-plans/:id",
    {
      schema: {
        tags: ["Budget Planning - Plans"],
        description: "Delete a budget plan",
        params: {
          type: "object",
          required: ["workspaceId", "id"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            id: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.delete(request as AuthenticatedRequest, reply),
  );

  // Activate budget plan
  fastify.patch(
    "/:workspaceId/budget-plans/:id/activate",
    {
      schema: {
        tags: ["Budget Planning - Plans"],
        description: "Activate a budget plan",
        params: {
          type: "object",
          required: ["workspaceId", "id"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            id: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.activate(request as AuthenticatedRequest, reply),
  );
}
