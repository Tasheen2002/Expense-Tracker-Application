import { IWorkspaceAccessPort } from '../ports/workspace-access.port';
import { authorizeWorkspaceRead } from './authorize-workspace-read';
import { CategorySuggestionService } from '../services/category-suggestion.service';
import { SuggestionId } from '../../domain/value-objects/suggestion-id';
import {  WorkspaceId  } from '@core/domain/value-objects';
import { CategorySuggestionDTO } from '../../domain/entities/category-suggestion.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetSuggestionByIdQuery extends IQuery {
  readonly suggestionId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class GetSuggestionByIdHandler implements IQueryHandler<
  GetSuggestionByIdQuery,
  CategorySuggestionDTO
> {
  constructor(private readonly suggestionService: Pick<CategorySuggestionService, 'getSuggestionById'>, private readonly workspaceAccess: IWorkspaceAccessPort) {}

  async handle(query: GetSuggestionByIdQuery): Promise<CategorySuggestionDTO> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    await authorizeWorkspaceRead(query.userId, workspaceId, this.workspaceAccess);
    return this.suggestionService.getSuggestionById(
      SuggestionId.fromString(query.suggestionId),
      workspaceId
    );
  }
}
