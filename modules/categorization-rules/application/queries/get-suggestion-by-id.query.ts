import { CategorySuggestionService } from '../services/category-suggestion.service'
import { SuggestionId } from '../../domain/value-objects/suggestion-id'

export interface GetSuggestionByIdQuery {
  suggestionId: string
}

export class GetSuggestionByIdHandler {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async execute(query: GetSuggestionByIdQuery) {
    const suggestion = await this.suggestionService.getSuggestionById(
      SuggestionId.fromString(query.suggestionId)
    )

    return {
      id: suggestion.getId().getValue(),
      workspaceId: suggestion.getWorkspaceId().getValue(),
      expenseId: suggestion.getExpenseId().getValue(),
      suggestedCategoryId: suggestion.getSuggestedCategoryId().getValue(),
      confidence: suggestion.getConfidence().getValue(),
      reason: suggestion.getReason(),
      isAccepted: suggestion.getIsAccepted(),
      createdAt: suggestion.getCreatedAt(),
      respondedAt: suggestion.getRespondedAt(),
    }
  }
}
