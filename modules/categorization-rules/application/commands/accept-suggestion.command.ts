import { CategorySuggestionService } from '../services/category-suggestion.service';
import { CategorySuggestionDTO } from '../../domain/entities/category-suggestion.entity';
import { SuggestionId } from '../../domain/value-objects/suggestion-id';
import { WorkspaceId } from '../../../identity-workspace';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface AcceptSuggestionCommand extends ICommand {
  readonly suggestionId: string;
  readonly workspaceId: string;
}

export class AcceptSuggestionHandler implements ICommandHandler<
  AcceptSuggestionCommand,
  CommandResult<CategorySuggestionDTO>
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(command: AcceptSuggestionCommand): Promise<CommandResult<CategorySuggestionDTO>> {
    const dto = await this.suggestionService.acceptSuggestion(
      SuggestionId.fromString(command.suggestionId),
      WorkspaceId.fromString(command.workspaceId)
    );

    return CommandResult.success(dto);
  }
}
