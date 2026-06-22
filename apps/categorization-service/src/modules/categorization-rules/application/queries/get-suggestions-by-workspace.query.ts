import { CategorySuggestionService } from '../services/category-suggestion.service';
import {  WorkspaceId  } from '@core/domain/value-objects';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { CategorySuggestionDTO } from '../../domain/entities/category-suggestion.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetSuggestionsByWorkspaceQuery extends IQuery {
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
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
