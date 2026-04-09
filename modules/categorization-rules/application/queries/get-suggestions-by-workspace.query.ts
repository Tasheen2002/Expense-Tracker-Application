import { CategorySuggestionService } from '../services/category-suggestion.service';
import { WorkspaceId } from '../../../identity-workspace';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { CategorySuggestionDTO } from '../../domain/entities/category-suggestion.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetSuggestionsByWorkspaceQuery extends IQuery {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class GetSuggestionsByWorkspaceHandler implements IQueryHandler<
  GetSuggestionsByWorkspaceQuery,
  PaginatedResult<CategorySuggestionDTO>
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(query: GetSuggestionsByWorkspaceQuery): Promise<PaginatedResult<CategorySuggestionDTO>> {
    return this.suggestionService.getSuggestionsByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      { limit: query.limit, offset: query.offset }
    );
  }
}
