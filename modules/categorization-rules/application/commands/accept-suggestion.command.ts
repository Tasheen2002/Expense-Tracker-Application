import { CategorySuggestionService } from '../services/category-suggestion.service'
import { SuggestionId } from '../../domain/value-objects/suggestion-id'

export interface AcceptSuggestionCommand {
  suggestionId: string
}

export class AcceptSuggestionHandler {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async execute(command: AcceptSuggestionCommand) {
    const suggestion = await this.suggestionService.acceptSuggestion(
      SuggestionId.fromString(command.suggestionId)
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
