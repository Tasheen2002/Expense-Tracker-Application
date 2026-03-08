import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';
import { CategoryService } from '../services/category.service';
import { Category } from '../../domain/entities/category.entity';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';

export interface ListCategoriesQuery extends IQuery {
  readonly workspaceId: string;
  readonly activeOnly?: boolean;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListCategoriesHandler implements IQueryHandler<
  ListCategoriesQuery,
  QueryResult<PaginatedResult<Category>>
> {
  constructor(private readonly categoryService: CategoryService) {}

  async handle(
    query: ListCategoriesQuery
  ): Promise<QueryResult<PaginatedResult<Category>>> {
    try {
      const pagination = { limit: query.limit, offset: query.offset };
      const result = query.activeOnly
        ? await this.categoryService.getActiveCategoriesByWorkspace(
            query.workspaceId,
            pagination
          )
        : await this.categoryService.getCategoriesByWorkspace(
            query.workspaceId,
            pagination
          );
      return QueryResult.success(result);
    } catch (error) {
      return QueryResult.failure(
        error instanceof Error ? error.message : 'Failed to list categories'
      );
    }
  }
}
