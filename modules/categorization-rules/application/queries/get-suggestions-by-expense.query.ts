import { CategorySuggestionService } from '../services/category-suggestion.service'
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'

export interface GetSuggestionsByExpenseQuery {
  expenseId: string
  workspaceId: string
}

export class GetSuggestionsByExpenseHandler {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async execute(query: GetSuggestionsByExpenseQuery) {
    const suggestions = await this.suggestionService.getSuggestionsByExpenseId(
      ExpenseId.fromString(query.expenseId),
      WorkspaceId.fromString(query.workspaceId)
    )

    return suggestions.items.map((suggestion) => ({
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
