import { CategorySuggestionService } from '../services/category-suggestion.service'
import { SuggestionId } from '../../domain/value-objects/suggestion-id'
import { CategorizationRuleDomainError } from '../../domain/errors/categorization-rules.errors'
import { ICommand, ICommandHandler, CommandResult } from '../../../../packages/core/src/application/cqrs'

export interface DeleteSuggestionCommand extends ICommand {
  readonly suggestionId: string
}

export class DeleteSuggestionHandler implements ICommandHandler<DeleteSuggestionCommand, CommandResult<void>> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(command: DeleteSuggestionCommand): Promise<CommandResult<void>> {
    try {
      await this.suggestionService.deleteSuggestion(
        SuggestionId.fromString(command.suggestionId)
      )
      return CommandResult.success<void>(undefined)
    } catch (error) {
      if (error instanceof CategorizationRuleDomainError) {
        throw error
      }
      if (error instanceof Error) {
        return CommandResult.failure<void>(error.message)
      }
      return CommandResult.failure<void>('Failed to delete category suggestion')
    }
  }
}

