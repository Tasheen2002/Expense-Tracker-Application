import { FastifyInstance } from "fastify";
import { CategorySuggestionController } from "../controllers/category-suggestion.controller";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";

export async function categorySuggestionRoutes(
  fastify: FastifyInstance,
  controller: CategorySuggestionController,
) {
  // Create category suggestion
  fastify.post(
    "/:workspaceId/suggestions",
    {
      schema: {
        tags: ["Categorization Rules - Suggestions"],
        description: "Create a new category suggestion",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["expenseId", "suggestedCategoryId", "confidence"],
          properties: {
            expenseId: { type: "string", format: "uuid" },
            suggestedCategoryId: { type: "string", format: "uuid" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            reason: { type: "string", maxLength: 500 },
          },
        },
      },
    },
    (request, reply) => controller.createSuggestion(request as AuthenticatedRequest, reply),
  );

  // List category suggestions
  fastify.get(
    "/:workspaceId/suggestions",
    {
      schema: {
        tags: ["Categorization Rules - Suggestions"],
        description: "List category suggestions in workspace",
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
            pendingOnly: { type: "string", enum: ["true", "false"] },
            limit: { type: "string", pattern: "^[0-9]+$" },
            offset: { type: "string", pattern: "^[0-9]+$" },
          },
        },
      },
    },
    (request, reply) => controller.listSuggestions(request as AuthenticatedRequest, reply),
  );

  // Get single category suggestion
  fastify.get(
    "/:workspaceId/suggestions/:suggestionId",
    {
      schema: {
        tags: ["Categorization Rules - Suggestions"],
        description: "Get a specific category suggestion",
        params: {
          type: "object",
          required: ["workspaceId", "suggestionId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            suggestionId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.getSuggestionById(request as AuthenticatedRequest, reply),
  );

  // Get suggestions by expense
  fastify.get(
    "/:workspaceId/suggestions/expense/:expenseId",
    {
      schema: {
        tags: ["Categorization Rules - Suggestions"],
        description: "Get category suggestions for a specific expense",
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
      controller.getSuggestionsByExpense(request as AuthenticatedRequest, reply),
  );

  // Accept suggestion
  fastify.patch(
    "/:workspaceId/suggestions/:suggestionId/accept",
    {
      schema: {
        tags: ["Categorization Rules - Suggestions"],
        description: "Accept a category suggestion",
        params: {
          type: "object",
          required: ["workspaceId", "suggestionId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            suggestionId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.acceptSuggestion(request as AuthenticatedRequest, reply),
  );

  // Reject suggestion
  fastify.patch(
    "/:workspaceId/suggestions/:suggestionId/reject",
    {
      schema: {
        tags: ["Categorization Rules - Suggestions"],
        description: "Reject a category suggestion",
        params: {
          type: "object",
          required: ["workspaceId", "suggestionId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            suggestionId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.rejectSuggestion(request as AuthenticatedRequest, reply),
  );

  // Delete suggestion
  fastify.delete(
    "/:workspaceId/suggestions/:suggestionId",
    {
      schema: {
        tags: ["Categorization Rules - Suggestions"],
        description: "Delete a category suggestion",
        params: {
          type: "object",
          required: ["workspaceId", "suggestionId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            suggestionId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.deleteSuggestion(request as AuthenticatedRequest, reply),
  );
}
