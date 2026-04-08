import { CategorySuggestionService } from '../services/category-suggestion.service';
import { WorkspaceId } from '../../../identity-workspace';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { CategorySuggestionDTO } from '../../domain/entities/category-suggestion.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetSuggestionsByWorkspaceQuery extends IQuery {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class GetSuggestionsByWorkspaceHandler implements IQueryHandler<
  GetSuggestionsByWorkspaceQuery,
  QueryResult<PaginatedResult<CategorySuggestionDTO>>
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(
    query: GetSuggestionsByWorkspaceQuery
  ): Promise<QueryResult<PaginatedResult<CategorySuggestionDTO>>> {
    const result = await this.suggestionService.getSuggestionsByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      { limit: query.limit, offset: query.offset }
    );

    return QueryResult.success(result);
  }
}
