import { CategorySuggestionService } from '../services/category-suggestion.service';
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetPendingSuggestionsByWorkspaceQuery extends IQuery {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class GetPendingSuggestionsByWorkspaceHandler implements IQueryHandler<
  GetPendingSuggestionsByWorkspaceQuery,
  QueryResult<PaginatedResult<CategorySuggestion>>
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(
    query: GetPendingSuggestionsByWorkspaceQuery
  ): Promise<QueryResult<PaginatedResult<CategorySuggestion>>> {
    const result =
      await this.suggestionService.getPendingSuggestionsByWorkspaceId(
        WorkspaceId.fromString(query.workspaceId),
        { limit: query.limit, offset: query.offset }
      );

    return QueryResult.success(result);
  }
}
