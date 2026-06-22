import { CategorySuggestionService } from '../services/category-suggestion.service';
import { SuggestionId } from '../../domain/value-objects/suggestion-id';
import {  WorkspaceId  } from '@core/domain/value-objects';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface DeleteSuggestionCommand extends ICommand {
  readonly suggestionId: string;
  readonly workspaceId: string;
}

export class DeleteSuggestionHandler implements ICommandHandler<
  DeleteSuggestionCommand,
  CommandResult<void>
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(command: DeleteSuggestionCommand): Promise<CommandResult<void>> {
    await this.suggestionService.deleteSuggestion(
      SuggestionId.fromString(command.suggestionId),
      WorkspaceId.fromString(command.workspaceId)
    );

    return CommandResult.success();
  }
}
