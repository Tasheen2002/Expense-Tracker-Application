import { CategorySuggestionService } from '../services/category-suggestion.service'
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { CategorySuggestion } from '../../domain/entities/category-suggestion.entity'
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs'
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface'

export interface GetSuggestionsByExpenseQuery extends IQuery {
  readonly expenseId: string
  readonly workspaceId: string
}

export class GetSuggestionsByExpenseHandler implements IQueryHandler<GetSuggestionsByExpenseQuery, PaginatedResult<CategorySuggestion>> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(query: GetSuggestionsByExpenseQuery): Promise<PaginatedResult<CategorySuggestion>> {
    return await this.suggestionService.getSuggestionsByExpenseId(
      ExpenseId.fromString(query.expenseId),
      WorkspaceId.fromString(query.workspaceId)
    )
  }
}

