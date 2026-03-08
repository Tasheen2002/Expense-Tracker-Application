import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { CreateCategoryHandler } from '../../../application/commands/create-category.command';
import { UpdateCategoryHandler } from '../../../application/commands/update-category.command';
import { DeleteCategoryHandler } from '../../../application/commands/delete-category.command';
import { GetCategoryHandler } from '../../../application/queries/get-category.query';
import { ListCategoriesHandler } from '../../../application/queries/list-categories.query';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

export class CategoryController {
  constructor(
    private readonly createCategoryHandler: CreateCategoryHandler,
    private readonly updateCategoryHandler: UpdateCategoryHandler,
    private readonly deleteCategoryHandler: DeleteCategoryHandler,
    private readonly getCategoryHandler: GetCategoryHandler,
    private readonly listCategoriesHandler: ListCategoriesHandler
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
    reply: FastifyReply
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

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to create category'
        );
      }

      if (!result.data) {
        return ResponseHelper.badRequest(reply, 'Category data unavailable');
      }

      const category = result.data;

      return ResponseHelper.created(
        reply,
        'Category created successfully',
        category.toJSON()
      );
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
    reply: FastifyReply
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

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to update category'
        );
      }

      if (!result.data) {
        return ResponseHelper.notFound(reply, 'Category not found');
      }

      const category = result.data;

      return ResponseHelper.ok(
        reply,
        'Category updated successfully',
        category.toJSON()
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteCategory(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; categoryId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, categoryId } = request.params;

      const result = await this.deleteCategoryHandler.handle({
        categoryId,
        workspaceId,
      });

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to delete category'
        );
      }

      return ResponseHelper.ok(reply, 'Category deleted successfully');
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getCategory(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; categoryId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, categoryId } = request.params;

      const result = await this.getCategoryHandler.handle({
        categoryId,
        workspaceId,
      });

      if (!result.success || !result.data) {
        return ResponseHelper.notFound(
          reply,
          result.error ?? 'Category not found'
        );
      }

      const category = result.data;

      return ResponseHelper.ok(
        reply,
        'Category retrieved successfully',
        category.toJSON()
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listCategories(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { activeOnly?: string; limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { activeOnly, limit, offset } = request.query;

      const result = await this.listCategoriesHandler.handle({
        workspaceId,
        activeOnly: activeOnly === 'true',
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to retrieve categories'
        );
      }

      if (!result.data) {
        return ResponseHelper.badRequest(reply, 'Categories data unavailable');
      }

      return ResponseHelper.ok(reply, 'Categories retrieved successfully', {
        items: result.data.items.map((category) => category.toJSON()),
        pagination: {
          total: result.data.total,
          limit: result.data.limit,
          offset: result.data.offset,
          hasMore: result.data.hasMore,
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
