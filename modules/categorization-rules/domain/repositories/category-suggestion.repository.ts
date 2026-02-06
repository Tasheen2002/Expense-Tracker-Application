import { CategorySuggestion } from "../entities/category-suggestion.entity";
import { SuggestionId } from "../value-objects/suggestion-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { ExpenseId } from "../../../expense-ledger/domain/value-objects/expense-id";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface CategorySuggestionRepository {
  save(suggestion: CategorySuggestion): Promise<void>;
  findById(id: SuggestionId): Promise<CategorySuggestion | null>;
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
