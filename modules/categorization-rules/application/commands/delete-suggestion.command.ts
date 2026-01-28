import { CategorySuggestionService } from '../services/category-suggestion.service'
import { SuggestionId } from '../../domain/value-objects/suggestion-id'

export interface DeleteSuggestionCommand {
  suggestionId: string
}

export class DeleteSuggestionHandler {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async execute(command: DeleteSuggestionCommand): Promise<void> {
    await this.suggestionService.deleteSuggestion(
      SuggestionId.fromString(command.suggestionId)
    )
  }
}
