import { CategorySuggestionService } from '../services/category-suggestion.service';
import { SuggestionId } from '../../domain/value-objects/suggestion-id';
import { WorkspaceId } from '../../../identity-workspace';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface AcceptSuggestionCommand extends ICommand {
  suggestionId: string;
  workspaceId: string;
}

export class AcceptSuggestionHandler implements ICommandHandler<
  AcceptSuggestionCommand,
  CommandResult<void>
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(command: AcceptSuggestionCommand): Promise<CommandResult<void>> {
    await this.suggestionService.acceptSuggestion(
      SuggestionId.fromString(command.suggestionId),
      WorkspaceId.fromString(command.workspaceId)
    );

    return CommandResult.success();
  }
}
