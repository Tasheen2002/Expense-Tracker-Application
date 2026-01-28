import { FastifyInstance } from "fastify";
import { ForecastController } from "../controllers/forecast.controller";

export async function forecastRoutes(
  fastify: FastifyInstance,
  controller: ForecastController,
) {
  // ==========================================
  // Forecast Routes
  // ==========================================

  // Create forecast
  fastify.post(
    "/:workspaceId/budget-plans/:planId/forecasts",
    {
      schema: {
        tags: ["Budget Planning - Forecasts"],
        description: "Create a new forecast for a budget plan",
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
          required: ["name", "type"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 100 },
            type: {
              type: "string",
              enum: ["BASELINE", "OPTIMISTIC", "PESSIMISTIC", "CUSTOM"],
            },
          },
        },
      },
    },
    (request, reply) => controller.create(request as any, reply),
  );

  // List forecasts for a plan
  fastify.get(
    "/:workspaceId/budget-plans/:planId/forecasts",
    {
      schema: {
        tags: ["Budget Planning - Forecasts"],
        description: "List all forecasts for a budget plan",
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
    (request, reply) => controller.list(request as any, reply),
  );

  // Get single forecast
  fastify.get(
    "/:workspaceId/forecasts/:id",
    {
      schema: {
        tags: ["Budget Planning - Forecasts"],
        description: "Get a specific forecast",
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
    (request, reply) => controller.get(request as any, reply),
  );

  // Delete forecast
  fastify.delete(
    "/:workspaceId/forecasts/:id",
    {
      schema: {
        tags: ["Budget Planning - Forecasts"],
        description: "Delete a forecast",
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
    (request, reply) => controller.delete(request as any, reply),
  );

  // ==========================================
  // Forecast Item Routes
  // ==========================================

  // Add forecast item
  fastify.post(
    "/:workspaceId/forecasts/:forecastId/items",
    {
      schema: {
        tags: ["Budget Planning - Forecast Items"],
        description: "Add an item to a forecast",
        params: {
          type: "object",
          required: ["workspaceId", "forecastId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            forecastId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["categoryId", "amount"],
          properties: {
            categoryId: { type: "string", format: "uuid" },
            amount: { type: "number", minimum: 0 },
            notes: { type: "string", maxLength: 500 },
          },
        },
      },
    },
    (request, reply) => controller.addItem(request as any, reply),
  );

  // List forecast items
  fastify.get(
    "/:workspaceId/forecasts/:forecastId/items",
    {
      schema: {
        tags: ["Budget Planning - Forecast Items"],
        description: "List all items in a forecast",
        params: {
          type: "object",
          required: ["workspaceId", "forecastId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            forecastId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.listItems(request as any, reply),
  );

  // Delete forecast item
  fastify.delete(
    "/:workspaceId/forecast-items/:itemId",
    {
      schema: {
        tags: ["Budget Planning - Forecast Items"],
        description: "Delete a forecast item",
        params: {
          type: "object",
          required: ["workspaceId", "itemId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            itemId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.deleteItem(request as any, reply),
  );
}
