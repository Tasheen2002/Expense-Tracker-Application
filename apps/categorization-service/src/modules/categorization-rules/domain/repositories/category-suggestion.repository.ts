import { CategorySuggestion } from "../entities/category-suggestion.entity";
import { SuggestionId } from "../value-objects/suggestion-id";
import {  WorkspaceId  } from '@core/domain/value-objects';
import {  ExpenseId  } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface ICategorySuggestionRepository {
  save(suggestion: CategorySuggestion): Promise<void>;
  findById(id: SuggestionId, workspaceId: WorkspaceId): Promise<CategorySuggestion | null>;
  findByExpenseId(
    expenseId: ExpenseId,
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<CategorySuggestion>>;
  findPendingByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<CategorySuggestion>>;
  findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<CategorySuggestion>>;
  delete(id: SuggestionId): Promise<void>;
}
