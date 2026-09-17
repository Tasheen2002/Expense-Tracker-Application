import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { CategoryService } from '../services/category.service';
import { CategoryDTO } from '../../domain/entities/category.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';

export interface ListCategoriesQuery extends IQuery {
  readonly workspaceId: string;
  readonly activeOnly?: boolean;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListCategoriesHandler implements IQueryHandler<ListCategoriesQuery, PaginatedResult<CategoryDTO>> {
  constructor(private readonly categoryService: CategoryService) {}

  async handle(query: ListCategoriesQuery): Promise<PaginatedResult<CategoryDTO>> {
    const pagination = { limit: query.limit, offset: query.offset };
    return query.activeOnly
      ? this.categoryService.getActiveCategoriesByWorkspace(query.workspaceId, pagination)
      : this.categoryService.getCategoriesByWorkspace(query.workspaceId, pagination);
  }
}
