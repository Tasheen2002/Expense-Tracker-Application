import { CategorySuggestionService } from '../services/category-suggestion.service'
import { SuggestionId } from '../../domain/value-objects/suggestion-id'
import { CategorySuggestion } from '../../domain/entities/category-suggestion.entity'
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs'

export interface GetSuggestionByIdQuery extends IQuery {
  readonly suggestionId: string
}

export class GetSuggestionByIdHandler implements IQueryHandler<GetSuggestionByIdQuery, CategorySuggestion> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(query: GetSuggestionByIdQuery): Promise<CategorySuggestion> {
    return await this.suggestionService.getSuggestionById(
      SuggestionId.fromString(query.suggestionId)
    )
  }
}

