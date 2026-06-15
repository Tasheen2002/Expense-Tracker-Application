import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  CreateCategoryHandler,
  UpdateCategoryHandler,
  DeleteCategoryHandler,
  GetCategoryHandler,
  ListCategoriesHandler,
} from '../../../application';
import { ResponseHelper } from '@shared/response.helper';
import {
  CreateCategoryInput,
  UpdateCategoryInput,
  ListCategoriesQuery,
} from '../validation/category.schema';

export class CategoryController {
  constructor(
    private readonly createCategoryHandler: CreateCategoryHandler,
    private readonly updateCategoryHandler: UpdateCategoryHandler,
    private readonly deleteCategoryHandler: DeleteCategoryHandler,
    private readonly getCategoryHandler: GetCategoryHandler,
    private readonly listCategoriesHandler: ListCategoriesHandler
  ) {}

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
      Querystring: ListCategoriesQuery;
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
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async createCategory(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: CreateCategoryInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;

      const result = await this.createCategoryHandler.handle({
        workspaceId,
        name: request.body.name,
        description: request.body.description,
        color: request.body.color ?? undefined,
        icon: request.body.icon ?? undefined,
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
      Body: UpdateCategoryInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, categoryId } = request.params;

      const result = await this.updateCategoryHandler.handle({
        categoryId,
        workspaceId,
        name: request.body.name,
        description: request.body.description ?? undefined,
        color: request.body.color ?? undefined,
        icon: request.body.icon ?? undefined,
        isActive: request.body.isActive,
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
}
