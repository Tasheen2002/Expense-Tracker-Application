import { CategorySuggestionService } from '../services/category-suggestion.service';
import { ExpenseId } from '../../../expense-ledger';
import { WorkspaceId } from '../../../identity-workspace';
import { CategorySuggestionDTO } from '../../domain/entities/category-suggestion.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetSuggestionsByExpenseQuery extends IQuery {
  expenseId: string;
  workspaceId: string;
}

export class GetSuggestionsByExpenseHandler implements IQueryHandler<
  GetSuggestionsByExpenseQuery,
  CategorySuggestionDTO[]
> {
  constructor(private readonly suggestionService: CategorySuggestionService) {}

  async handle(query: GetSuggestionsByExpenseQuery): Promise<CategorySuggestionDTO[]> {
    const result = await this.suggestionService.getSuggestionsByExpenseId(
      ExpenseId.fromString(query.expenseId),
      WorkspaceId.fromString(query.workspaceId)
    );

    return result.items;
  }
}
