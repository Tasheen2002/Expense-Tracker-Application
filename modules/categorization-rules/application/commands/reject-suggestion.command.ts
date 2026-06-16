import { CategorySuggestionService } from '../services/category-suggestion.service'
import { SuggestionId } from '../../domain/value-objects/suggestion-id'
import { CategorizationRuleDomainError } from '../../domain/errors/categorization-rules.errors'
import { CategorySuggestion } from '../../domain/entities/category-suggestion.entity'
import { ICommand, ICommandHandler, CommandResult } from '../../../../packages/core/src/application/cqrs'

export interface RejectSuggestionCommand extends ICommand {
  readonly suggestionId: string
}

export class RejectSuggestionHandler implements ICommandHandler<RejectSuggestionCommand, CommandResult<CategorySuggestion>> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(command: RejectSuggestionCommand): Promise<CommandResult<CategorySuggestion>> {
    try {
      const suggestion = await this.suggestionService.rejectSuggestion(
        SuggestionId.fromString(command.suggestionId)
      )
      return CommandResult.success<CategorySuggestion>(suggestion)
    } catch (error) {
      if (error instanceof CategorizationRuleDomainError) {
        throw error
      }
      if (error instanceof Error) {
        return CommandResult.failure<CategorySuggestion>(error.message)
      }
      return CommandResult.failure<CategorySuggestion>('Failed to reject category suggestion')
    }
  }
}

