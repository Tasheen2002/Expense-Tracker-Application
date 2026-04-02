import { CategorySuggestionService } from '../services/category-suggestion.service';
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id';
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetSuggestionsByExpenseQuery extends IQuery {
  expenseId: string;
  workspaceId: string;
}

export class GetSuggestionsByExpenseHandler implements IQueryHandler<
  GetSuggestionsByExpenseQuery,
  QueryResult<CategorySuggestion[]>
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(
    query: GetSuggestionsByExpenseQuery
  ): Promise<QueryResult<CategorySuggestion[]>> {
    const suggestions = await this.suggestionService.getSuggestionsByExpenseId(
      ExpenseId.fromString(query.expenseId),
      WorkspaceId.fromString(query.workspaceId)
    );

    return QueryResult.success(suggestions.items);
  }
}
