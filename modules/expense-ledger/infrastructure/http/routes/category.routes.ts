import { FastifyInstance } from "fastify";
import { CategoryController } from "../controllers/category.controller";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";

export async function categoryRoutes(
  fastify: FastifyInstance,
  controller: CategoryController,
) {
  // Create category
  fastify.post(
    "/:workspaceId/categories",
    {
      schema: {
        tags: ["Category"],
        description: "Create a new category",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 100 },
            description: { type: "string", maxLength: 500 },
            color: { type: "string", pattern: "^#[0-9A-F]{6}$" },
            icon: { type: "string", maxLength: 50 },
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
                  categoryId: { type: "string" },
                  workspaceId: { type: "string" },
                  name: { type: "string" },
                  description: { type: "string" },
                  color: { type: "string" },
                  icon: { type: "string" },
                  isActive: { type: "boolean" },
                  createdAt: { type: "string" },
                  updatedAt: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.createCategory(request as AuthenticatedRequest, reply),
  );

  // Update category
  fastify.put(
    "/:workspaceId/categories/:categoryId",
    {
      schema: {
        tags: ["Category"],
        description: "Update a category",
        params: {
          type: "object",
          required: ["workspaceId", "categoryId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            categoryId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1, maxLength: 100 },
            description: { type: "string", maxLength: 500 },
            color: { type: "string", pattern: "^#[0-9A-F]{6}$" },
            icon: { type: "string", maxLength: 50 },
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
                  categoryId: { type: "string" },
                  workspaceId: { type: "string" },
                  name: { type: "string" },
                  description: { type: "string" },
                  color: { type: "string" },
                  icon: { type: "string" },
                  isActive: { type: "boolean" },
                  updatedAt: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.updateCategory(request as AuthenticatedRequest, reply),
  );

  // Delete category
  fastify.delete(
    "/:workspaceId/categories/:categoryId",
    {
      schema: {
        tags: ["Category"],
        description: "Delete a category",
        params: {
          type: "object",
          required: ["workspaceId", "categoryId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            categoryId: { type: "string", format: "uuid" },
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
    (request, reply) => controller.deleteCategory(request as AuthenticatedRequest, reply),
  );

  // Get category by ID
  fastify.get(
    "/:workspaceId/categories/:categoryId",
    {
      schema: {
        tags: ["Category"],
        description: "Get category by ID",
        params: {
          type: "object",
          required: ["workspaceId", "categoryId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            categoryId: { type: "string", format: "uuid" },
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
                  categoryId: { type: "string" },
                  workspaceId: { type: "string" },
                  name: { type: "string" },
                  description: { type: "string" },
                  color: { type: "string" },
                  icon: { type: "string" },
                  isActive: { type: "boolean" },
                  createdAt: { type: "string" },
                  updatedAt: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.getCategory(request as AuthenticatedRequest, reply),
  );

  // List categories
  fastify.get(
    "/:workspaceId/categories",
    {
      schema: {
        tags: ["Category"],
        description: "List all categories",
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
                        categoryId: { type: "string" },
                        workspaceId: { type: "string" },
                        name: { type: "string" },
                        description: { type: "string" },
                        color: { type: "string" },
                        icon: { type: "string" },
                        isActive: { type: "boolean" },
                        createdAt: { type: "string" },
                        updatedAt: { type: "string" },
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
    (request, reply) => controller.listCategories(request as AuthenticatedRequest, reply),
  );
}
