import { CategorySuggestionService } from '../services/category-suggestion.service';
import { SuggestionId } from '../../domain/value-objects/suggestion-id';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface DeleteSuggestionCommand extends ICommand {
  suggestionId: string;
}

export class DeleteSuggestionHandler implements ICommandHandler<
  DeleteSuggestionCommand,
  CommandResult<void>
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(command: DeleteSuggestionCommand): Promise<CommandResult<void>> {
    await this.suggestionService.deleteSuggestion(
      SuggestionId.fromString(command.suggestionId)
    );

    return CommandResult.success();
  }
}
