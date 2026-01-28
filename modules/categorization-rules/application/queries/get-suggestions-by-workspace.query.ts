import { CategorySuggestionService } from '../services/category-suggestion.service'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'

export interface GetSuggestionsByWorkspaceQuery {
  workspaceId: string
  limit?: number
}

export class GetSuggestionsByWorkspaceHandler {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async execute(query: GetSuggestionsByWorkspaceQuery) {
    const suggestions = await this.suggestionService.getSuggestionsByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      query.limit
    )

    return suggestions.map((suggestion) => ({
      id: suggestion.getId().getValue(),
      workspaceId: suggestion.getWorkspaceId().getValue(),
      expenseId: suggestion.getExpenseId().getValue(),
      suggestedCategoryId: suggestion.getSuggestedCategoryId().getValue(),
      confidence: suggestion.getConfidence().getValue(),
      reason: suggestion.getReason(),
      isAccepted: suggestion.getIsAccepted(),
      createdAt: suggestion.getCreatedAt(),
      respondedAt: suggestion.getRespondedAt(),
    }))
  }
}
