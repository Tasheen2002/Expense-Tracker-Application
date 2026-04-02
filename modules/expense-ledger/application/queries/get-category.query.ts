import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { CategoryService } from '../services/category.service';
import { Category } from '../../domain/entities/category.entity';
import { CategoryNotFoundError } from '../../domain/errors/expense.errors';

export interface GetCategoryQuery extends IQuery {
  readonly categoryId: string;
  readonly workspaceId: string;
}

export class GetCategoryHandler implements IQueryHandler<
  GetCategoryQuery,
  QueryResult<Category>
> {
  constructor(private readonly categoryService: CategoryService) {}

  async handle(query: GetCategoryQuery): Promise<QueryResult<Category>> {
    const category = await this.categoryService.getCategoryById(
      query.categoryId,
      query.workspaceId
    );

    if (!category) {
      throw new CategoryNotFoundError(query.categoryId, query.workspaceId);
    }

    return QueryResult.success(category);
  }
}
