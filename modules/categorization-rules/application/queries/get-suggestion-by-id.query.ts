import { CategorySuggestionService } from '../services/category-suggestion.service';
import { SuggestionId } from '../../domain/value-objects/suggestion-id';
import { WorkspaceId } from '../../../identity-workspace';
import { CategorySuggestion, CategorySuggestionDTO } from '../../domain/entities/category-suggestion.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetSuggestionByIdQuery extends IQuery {
  suggestionId: string;
  workspaceId: string;
}

export class GetSuggestionByIdHandler implements IQueryHandler<
  GetSuggestionByIdQuery,
  QueryResult<CategorySuggestionDTO>
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(
    query: GetSuggestionByIdQuery
  ): Promise<QueryResult<CategorySuggestionDTO>> {
    const suggestion = await this.suggestionService.getSuggestionById(
      SuggestionId.fromString(query.suggestionId),
      WorkspaceId.fromString(query.workspaceId)
    );

    return QueryResult.success(CategorySuggestion.toDTO(suggestion));
  }
}
