import { CategorySuggestionService } from '../services/category-suggestion.service';
import { WorkspaceId } from '../../../identity-workspace';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { CategorySuggestion, CategorySuggestionDTO } from '../../domain/entities/category-suggestion.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetPendingSuggestionsByWorkspaceQuery extends IQuery {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class GetPendingSuggestionsByWorkspaceHandler implements IQueryHandler<
  GetPendingSuggestionsByWorkspaceQuery,
  QueryResult<PaginatedResult<CategorySuggestionDTO>>
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(
    query: GetPendingSuggestionsByWorkspaceQuery
  ): Promise<QueryResult<PaginatedResult<CategorySuggestionDTO>>> {
    const result =
      await this.suggestionService.getPendingSuggestionsByWorkspaceId(
        WorkspaceId.fromString(query.workspaceId),
        { limit: query.limit, offset: query.offset }
      );

    return QueryResult.success({
      items: result.items.map(CategorySuggestion.toDTO),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }
}
