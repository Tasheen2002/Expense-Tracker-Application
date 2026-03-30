import { CategorySuggestionService } from '../services/category-suggestion.service';
import { SuggestionId } from '../../domain/value-objects/suggestion-id';
import { CategorySuggestion } from '../../domain/entities/category-suggestion.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetSuggestionByIdQuery extends IQuery {
  suggestionId: string;
}

export class GetSuggestionByIdHandler implements IQueryHandler<
  GetSuggestionByIdQuery,
  QueryResult<CategorySuggestion>
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(
    query: GetSuggestionByIdQuery
  ): Promise<QueryResult<CategorySuggestion>> {
    const suggestion = await this.suggestionService.getSuggestionById(
      SuggestionId.fromString(query.suggestionId)
    );

    return QueryResult.success(suggestion);
  }
}
