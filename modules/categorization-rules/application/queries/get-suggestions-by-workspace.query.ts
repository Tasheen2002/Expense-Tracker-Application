import { CategorySuggestionService } from '../services/category-suggestion.service';
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
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
  QueryResult<PaginatedResult<CategorySuggestion>>
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(
    query: GetSuggestionsByWorkspaceQuery
  ): Promise<QueryResult<PaginatedResult<CategorySuggestion>>> {
    const result = await this.suggestionService.getSuggestionsByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      { limit: query.limit, offset: query.offset }
    );

    return QueryResult.success(result);
  }
}
