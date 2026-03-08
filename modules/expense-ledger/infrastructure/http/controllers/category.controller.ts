import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { CreateCategoryHandler } from "../../../application/commands/create-category.command";
import { UpdateCategoryHandler } from "../../../application/commands/update-category.command";
import { DeleteCategoryHandler } from "../../../application/commands/delete-category.command";
import { GetCategoryHandler } from "../../../application/queries/get-category.query";
import { ListCategoriesHandler } from "../../../application/queries/list-categories.query";
import { Category } from "../../../domain/entities/category.entity";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";

export class CategoryController {
  constructor(
    private readonly createCategoryHandler: CreateCategoryHandler,
    private readonly updateCategoryHandler: UpdateCategoryHandler,
    private readonly deleteCategoryHandler: DeleteCategoryHandler,
    private readonly getCategoryHandler: GetCategoryHandler,
    private readonly listCategoriesHandler: ListCategoriesHandler,
  ) {}

  async createCategory(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: {
        name: string;
        description?: string;
        color?: string;
        icon?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;

      const result = await this.createCategoryHandler.handle({
        workspaceId,
        name: request.body.name,
        description: request.body.description,
        color: request.body.color,
        icon: request.body.icon,
      });

      if (!result.success || !result.data) {
        return ResponseHelper.badRequest(reply, result.error ?? "Failed to create category");
      }

      const category = result.data;

      return ResponseHelper.created(reply, "Category created successfully", {
        categoryId: category.id.getValue(),
        workspaceId: category.workspaceId,
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        isActive: category.isActive,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateCategory(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; categoryId: string };
      Body: {
        name?: string;
        description?: string;
        color?: string;
        icon?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, categoryId } = request.params;

      const result = await this.updateCategoryHandler.handle({
        categoryId,
        workspaceId,
        name: request.body.name,
        description: request.body.description,
        color: request.body.color,
        icon: request.body.icon,
      });

      if (!result.success || !result.data) {
        return ResponseHelper.badRequest(reply, result.error ?? "Failed to update category");
      }

      const category = result.data;

      return ResponseHelper.ok(reply, "Category updated successfully", {
        categoryId: category.id.getValue(),
        workspaceId: category.workspaceId,
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        isActive: category.isActive,
        updatedAt: category.updatedAt.toISOString(),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteCategory(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; categoryId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, categoryId } = request.params;

      const result = await this.deleteCategoryHandler.handle({
        categoryId,
        workspaceId,
      });

      if (!result.success) {
        return ResponseHelper.badRequest(reply, result.error ?? "Failed to delete category");
      }

      return ResponseHelper.ok(reply, "Category deleted successfully");
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getCategory(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; categoryId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, categoryId } = request.params;

      const result = await this.getCategoryHandler.handle({
        categoryId,
        workspaceId,
      });

      if (!result.success || !result.data) {
        return ResponseHelper.notFound(reply, result.error ?? "Category not found");
      }

      const category = result.data;

      return ResponseHelper.ok(reply, "Category retrieved successfully", {
        categoryId: category.id.getValue(),
        workspaceId: category.workspaceId,
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        isActive: category.isActive,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listCategories(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { activeOnly?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const { activeOnly } = request.query;

      const result = await this.listCategoriesHandler.handle({
        workspaceId,
        activeOnly: activeOnly === "true",
      });

      if (!result.success || !result.data) {
        return ResponseHelper.badRequest(reply, result.error ?? "Failed to retrieve categories");
      }

      return ResponseHelper.ok(reply, "Categories retrieved successfully", {
        items: result.data.map((category: Category) => ({
          categoryId: category.id.getValue(),
          workspaceId: category.workspaceId,
          name: category.name,
          description: category.description,
          color: category.color,
          icon: category.icon,
          isActive: category.isActive,
          createdAt: category.createdAt.toISOString(),
          updatedAt: category.updatedAt.toISOString(),
        })),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
