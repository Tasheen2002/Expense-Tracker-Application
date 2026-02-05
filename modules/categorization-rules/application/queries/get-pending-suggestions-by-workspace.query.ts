import { CategorySuggestionService } from '../services/category-suggestion.service'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface'

export interface GetPendingSuggestionsByWorkspaceQuery {
  workspaceId: string
  limit?: number
  offset?: number
}

export class GetPendingSuggestionsByWorkspaceHandler {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async execute(
    query: GetPendingSuggestionsByWorkspaceQuery,
  ): Promise<PaginatedResult<any>> {
    const result = await this.suggestionService.getPendingSuggestionsByWorkspaceId(
      WorkspaceId.fromString(query.workspaceId),
      { limit: query.limit, offset: query.offset },
    )

    return {
      items: result.items.map((suggestion) => ({
        id: suggestion.getId().getValue(),
        workspaceId: suggestion.getWorkspaceId().getValue(),
        expenseId: suggestion.getExpenseId().getValue(),
        suggestedCategoryId: suggestion.getSuggestedCategoryId().getValue(),
        confidence: suggestion.getConfidence().getValue(),
        reason: suggestion.getReason(),
        isAccepted: suggestion.getIsAccepted(),
        createdAt: suggestion.getCreatedAt(),
        respondedAt: suggestion.getRespondedAt(),
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    }
  }
}
