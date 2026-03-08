import { IQuery, IQueryHandler, QueryResult } from "../../../../apps/api/src/shared/application";
import { CategoryService } from "../services/category.service";
import { Category } from "../../domain/entities/category.entity";

export interface ListCategoriesQuery extends IQuery {
  readonly workspaceId: string;
  readonly activeOnly?: boolean;
}

export class ListCategoriesHandler implements IQueryHandler<ListCategoriesQuery, QueryResult<Category[]>> {
  constructor(private readonly categoryService: CategoryService) {}

  async handle(query: ListCategoriesQuery): Promise<QueryResult<Category[]>> {
    try {
      const result = query.activeOnly
        ? await this.categoryService.getActiveCategoriesByWorkspace(query.workspaceId)
        : await this.categoryService.getCategoriesByWorkspace(query.workspaceId);
      return QueryResult.success(result.items);
    } catch (error) {
      return QueryResult.failure(
        error instanceof Error ? error.message : "Failed to list categories",
      );
    }
  }
}
