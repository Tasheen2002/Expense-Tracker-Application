import { IWorkspaceAccessPort } from '../ports/workspace-access.port';
import { authorizeWorkspaceRead } from './authorize-workspace-read';
import { CategorySuggestionService } from '../services/category-suggestion.service';
import {  WorkspaceId  } from '@core/domain/value-objects';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { CategorySuggestionDTO } from '../../domain/entities/category-suggestion.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetSuggestionsByWorkspaceQuery extends IQuery {
  readonly workspaceId: string;
  readonly userId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class GetSuggestionsByWorkspaceHandler implements IQueryHandler<
  GetSuggestionsByWorkspaceQuery,
  PaginatedResult<CategorySuggestionDTO>
> {
  constructor(private readonly suggestionService: Pick<CategorySuggestionService, 'getSuggestionsByWorkspaceId'>, private readonly workspaceAccess: IWorkspaceAccessPort) {}

  async handle(query: GetSuggestionsByWorkspaceQuery): Promise<PaginatedResult<CategorySuggestionDTO>> {
    const workspaceId = WorkspaceId.fromString(query.workspaceId);
    await authorizeWorkspaceRead(query.userId, workspaceId, this.workspaceAccess);
    return this.suggestionService.getSuggestionsByWorkspaceId(
      workspaceId,
      { limit: query.limit, offset: query.offset }
    );
  }
}
