import { CategorySuggestion } from "../entities/category-suggestion.entity";
import { SuggestionId } from "../value-objects/suggestion-id";
import {  WorkspaceId  } from '@core/domain/value-objects';
import {  ExpenseId  } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface ICategorySuggestionRepository {
  /** Commit state and pending events together, preserving ownership and response finality. */
  save(suggestion: CategorySuggestion): Promise<void>;
  findById(id: SuggestionId, workspaceId: WorkspaceId): Promise<CategorySuggestion | null>;
  findByExpenseId(
    expenseId: ExpenseId,
    workspaceId: WorkspaceId,
    options?: Pick<PaginationOptions, 'limit' | 'offset'>,
  ): Promise<PaginatedResult<CategorySuggestion>>;
  findPendingByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: Pick<PaginationOptions, 'limit' | 'offset'>,
  ): Promise<PaginatedResult<CategorySuggestion>>;
  findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: Pick<PaginationOptions, 'limit' | 'offset'>,
  ): Promise<PaginatedResult<CategorySuggestion>>;
  delete(suggestion: CategorySuggestion): Promise<void>;
}
