import { IWorkspaceAccessPort } from '../ports/workspace-access.port';
import { ISuggestionAcceptancePort } from '../ports/suggestion-acceptance.port';
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

export interface AcceptSuggestionCommand extends ICommand {
  readonly suggestionId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class AcceptSuggestionHandler implements ICommandHandler<
  AcceptSuggestionCommand,
  CommandResult<CategorySuggestionDTO>
> {
  constructor(
    private readonly suggestionService: Pick<CategorySuggestionService, 'acceptSuggestion' | 'getSuggestionById'>,
    private readonly workspaceAccess: IWorkspaceAccessPort,
    private readonly acceptance: ISuggestionAcceptancePort,
  ) {}

  async handle(command: AcceptSuggestionCommand): Promise<CommandResult<CategorySuggestionDTO>> {
    const workspaceId = WorkspaceId.fromString(command.workspaceId);
    await authorizeWorkspaceWrite(command.userId, workspaceId, this.workspaceAccess);
    const suggestionId = SuggestionId.fromString(command.suggestionId);
    const suggestion = await this.suggestionService.getSuggestionById(suggestionId, workspaceId);
    const { expenseVersion } = await this.acceptance.validate({
      workspaceId: workspaceId.getValue(), expenseId: suggestion.expenseId,
      categoryId: suggestion.suggestedCategoryId, userId: command.userId,
    });
    const dto = await this.suggestionService.acceptSuggestion(
      suggestionId,
      workspaceId,
      command.userId,
      expenseVersion,
    );

    return CommandResult.success(dto);
  }
}
