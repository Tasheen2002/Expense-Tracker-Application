import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { CreateCategoryHandler } from '../../../application/commands/create-category.command';
import { UpdateCategoryHandler } from '../../../application/commands/update-category.command';
import { DeleteCategoryHandler } from '../../../application/commands/delete-category.command';
import { GetCategoryHandler } from '../../../application/queries/get-category.query';
import { ListCategoriesHandler } from '../../../application/queries/list-categories.query';
import { ResponseHelper } from '@shared/response.helper';

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

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Category created successfully',
        result.data,
        201
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

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Category updated successfully',
        result.data
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

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Category deleted successfully',
        undefined,
        204
      );
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

      return ResponseHelper.ok(reply, 'Category retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listCategories(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { activeOnly?: boolean; limit?: number; offset?: number };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { activeOnly, limit, offset } = request.query;

      const result = await this.listCategoriesHandler.handle({
        workspaceId,
        activeOnly,
        limit,
        offset,
      });

      return ResponseHelper.ok(reply, 'Categories retrieved successfully', {
        items: result.items,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
