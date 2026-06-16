import { CategorySuggestionService } from '../services/category-suggestion.service'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface'
import { CategorySuggestion } from '../../domain/entities/category-suggestion.entity'
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs'

export interface GetPendingSuggestionsByWorkspaceQuery extends IQuery {
  readonly workspaceId: string
  readonly limit?: number
  readonly offset?: number
}

export class GetPendingSuggestionsByWorkspaceHandler implements IQueryHandler<GetPendingSuggestionsByWorkspaceQuery, PaginatedResult<CategorySuggestion>> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(
    query: GetPendingSuggestionsByWorkspaceQuery,
  ): Promise<PaginatedResult<CategorySuggestion>> {
    return await this.suggestionService.getPendingSuggestionsByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      { limit: query.limit, offset: query.offset },
    )
  }
}

