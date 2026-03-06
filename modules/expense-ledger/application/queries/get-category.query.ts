import { CategoryNotFoundError } from "../../domain/errors/expense.errors";

import { CategoryService } from "../services/category.service";

export class GetCategoryQuery {
  constructor(
    public readonly categoryId: string,
    public readonly workspaceId: string,
  ) {}
}

export class GetCategoryHandler {
  constructor(private readonly categoryService: CategoryService) {}

  async handle(query: GetCategoryQuery) {
    const category = await this.categoryService.getCategoryById(
      query.categoryId,
      query.workspaceId,
    );

    if (!category) {
      throw new CategoryNotFoundError(query.categoryId, query.workspaceId);
    }

    return category;
  }
}
