import { CategorySuggestionService } from '../services/category-suggestion.service'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id'
import { CategoryId } from '../../../expense-ledger/domain/value-objects/category-id'
import { ConfidenceScore } from '../../domain/value-objects/confidence-score'

export interface CreateSuggestionCommand {
  workspaceId: string
  expenseId: string
  suggestedCategoryId: string
  confidence: number
  reason?: string
}

export class CreateSuggestionHandler {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async execute(command: CreateSuggestionCommand) {
    const suggestion = await this.suggestionService.createSuggestion({
      workspaceId: WorkspaceId.fromString(command.workspaceId),
      expenseId: ExpenseId.fromString(command.expenseId),
      suggestedCategoryId: CategoryId.fromString(command.suggestedCategoryId),
      confidence: ConfidenceScore.create(command.confidence),
      reason: command.reason,
    })

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
