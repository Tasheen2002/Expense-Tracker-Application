import { CategorySuggestionService } from '../services/category-suggestion.service'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id'
import { CategoryId } from '../../../expense-ledger/domain/value-objects/category-id'
import { ConfidenceScore } from '../../domain/value-objects/confidence-score'
import { CategorizationRuleDomainError } from '../../domain/errors/categorization-rules.errors'
import { CategorySuggestion } from '../../domain/entities/category-suggestion.entity'
import { ICommand, ICommandHandler, CommandResult } from '../../../../packages/core/src/application/cqrs'

export interface CreateSuggestionCommand extends ICommand {
  readonly workspaceId: string
  readonly expenseId: string
  readonly suggestedCategoryId: string
  readonly confidence: number
  readonly reason?: string
}

export class CreateSuggestionHandler implements ICommandHandler<CreateSuggestionCommand, CommandResult<CategorySuggestion>> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(command: CreateSuggestionCommand): Promise<CommandResult<CategorySuggestion>> {
    try {
      const suggestion = await this.suggestionService.createSuggestion({
        workspaceId: WorkspaceId.fromString(command.workspaceId),
        expenseId: ExpenseId.fromString(command.expenseId),
        suggestedCategoryId: CategoryId.fromString(command.suggestedCategoryId),
        confidence: ConfidenceScore.create(command.confidence),
        reason: command.reason,
      })

      return CommandResult.success<CategorySuggestion>(suggestion)
    } catch (error) {
      if (error instanceof CategorizationRuleDomainError) {
        throw error
      }
      if (error instanceof Error) {
        return CommandResult.failure<CategorySuggestion>(error.message)
      }
      return CommandResult.failure<CategorySuggestion>('An unexpected error occurred during category suggestion creation')
    }
  }
}

