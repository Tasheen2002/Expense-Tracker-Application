import { IWorkspaceAccessPort } from '../ports/workspace-access.port';
import { authorizeWorkspaceWrite } from './authorize-workspace-write';
import { CategorySuggestionService } from '../services/category-suggestion.service';
import { CategorySuggestionDTO } from '../../domain/entities/category-suggestion.entity';
import { SuggestionId } from '../../domain/value-objects/suggestion-id';
import {  WorkspaceId  } from '@core/domain/value-objects';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface RejectSuggestionCommand extends ICommand {
  readonly suggestionId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class RejectSuggestionHandler implements ICommandHandler<
  RejectSuggestionCommand,
  CommandResult<CategorySuggestionDTO>
> {
  constructor(private readonly suggestionService: Pick<CategorySuggestionService, 'rejectSuggestion'>, private readonly workspaceAccess: IWorkspaceAccessPort) {}

  async handle(command: RejectSuggestionCommand): Promise<CommandResult<CategorySuggestionDTO>> {
    const workspaceId = WorkspaceId.fromString(command.workspaceId);
    await authorizeWorkspaceWrite(command.userId, workspaceId, this.workspaceAccess);
    const dto = await this.suggestionService.rejectSuggestion(
      SuggestionId.fromString(command.suggestionId),
      workspaceId
    );

    return CommandResult.success(dto);
  }
}
