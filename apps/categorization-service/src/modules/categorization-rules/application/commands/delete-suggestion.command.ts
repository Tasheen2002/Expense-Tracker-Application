import { IWorkspaceAccessPort } from '../ports/workspace-access.port';
import { authorizeWorkspaceWrite } from './authorize-workspace-write';
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
  readonly userId: string;
}

export class DeleteSuggestionHandler implements ICommandHandler<
  DeleteSuggestionCommand,
  CommandResult<void>
> {
  constructor(private readonly suggestionService: Pick<CategorySuggestionService, 'deleteSuggestion'>, private readonly workspaceAccess: IWorkspaceAccessPort) {}

  async handle(command: DeleteSuggestionCommand): Promise<CommandResult<void>> {
    const workspaceId = WorkspaceId.fromString(command.workspaceId);
    await authorizeWorkspaceWrite(command.userId, workspaceId, this.workspaceAccess);
    await this.suggestionService.deleteSuggestion(
      SuggestionId.fromString(command.suggestionId),
      workspaceId
    );

    return CommandResult.success();
  }
}
