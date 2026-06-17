import { CategorySuggestionService } from '../services/category-suggestion.service';
import { WorkspaceId } from '../../../identity-workspace';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { CategorySuggestionDTO } from '../../domain/entities/category-suggestion.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetPendingSuggestionsByWorkspaceQuery extends IQuery {
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class GetPendingSuggestionsByWorkspaceHandler implements IQueryHandler<
  GetPendingSuggestionsByWorkspaceQuery,
  PaginatedResult<CategorySuggestionDTO>
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(query: GetPendingSuggestionsByWorkspaceQuery): Promise<PaginatedResult<CategorySuggestionDTO>> {
    return this.suggestionService.getPendingSuggestionsByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      { limit: query.limit, offset: query.offset }
    );
  }
}
