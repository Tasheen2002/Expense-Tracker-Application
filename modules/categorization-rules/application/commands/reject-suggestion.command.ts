import { CategorySuggestionService } from '../services/category-suggestion.service';
import { SuggestionId } from '../../domain/value-objects/suggestion-id';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface RejectSuggestionCommand extends ICommand {
  suggestionId: string;
}

export class RejectSuggestionHandler implements ICommandHandler<
  RejectSuggestionCommand,
  CommandResult<void>
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(command: RejectSuggestionCommand): Promise<CommandResult<void>> {
    await this.suggestionService.rejectSuggestion(
      SuggestionId.fromString(command.suggestionId)
    );

    return CommandResult.success();
  }
}
