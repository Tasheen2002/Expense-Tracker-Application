import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
import { CategoryService } from '../services/category.service';
import { CategoryDTO } from '../../domain/entities/category.entity';
import { CategoryNotFoundError } from '../../domain/errors/expense.errors';

export interface GetCategoryQuery extends IQuery {
  readonly categoryId: string;
  readonly workspaceId: string;
}

export class GetCategoryHandler implements IQueryHandler<GetCategoryQuery, CategoryDTO> {
  constructor(private readonly categoryService: CategoryService) {}

  async handle(query: GetCategoryQuery): Promise<CategoryDTO> {
    const category = await this.categoryService.getCategoryById(
      query.categoryId,
      query.workspaceId
    );

    if (!category) {
      throw new CategoryNotFoundError(query.categoryId, query.workspaceId);
    }

    return category;
  }
}
