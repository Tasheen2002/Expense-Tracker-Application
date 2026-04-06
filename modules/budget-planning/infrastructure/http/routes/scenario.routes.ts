import { FastifyInstance } from "fastify";
import { ScenarioController } from "../controllers/scenario.controller";
import { AuthenticatedRequest } from "@shared/interfaces/authenticated-request.interface";

export async function scenarioRoutes(
  fastify: FastifyInstance,
  controller: ScenarioController,
) {
  // ==========================================
  // Scenario Routes
  // ==========================================

  // Create scenario
  fastify.post(
    "/workspaces/:workspaceId/budget-plans/:planId/scenarios",
    {
      schema: {
        tags: ["Budget Planning - Scenarios"],
        description: "Create a new scenario for a budget plan",
        params: {
          type: "object",
          required: ["workspaceId", "planId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            planId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["name", "createdBy"],
          properties: {
            name: { type: "string", minLength: 3, maxLength: 100 },
            description: { type: "string", maxLength: 500 },
            assumptions: { type: "object" },
            createdBy: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.create(request as AuthenticatedRequest, reply),
  );

  // List scenarios for a plan
  fastify.get(
    "/workspaces/:workspaceId/budget-plans/:planId/scenarios",
    {
      schema: {
        tags: ["Budget Planning - Scenarios"],
        description: "List all scenarios for a budget plan",
        params: {
          type: "object",
          required: ["workspaceId", "planId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            planId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.list(request as AuthenticatedRequest, reply),
  );

  // Get single scenario
  fastify.get(
    "/workspaces/:workspaceId/scenarios/:id",
    {
      schema: {
        tags: ["Budget Planning - Scenarios"],
        description: "Get a specific scenario",
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

  // Delete scenario
  fastify.delete(
    "/workspaces/:workspaceId/scenarios/:id",
    {
      schema: {
        tags: ["Budget Planning - Scenarios"],
        description: "Delete a scenario",
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
}
