import { CategorySuggestion } from '../entities/category-suggestion.entity'
import { SuggestionId } from '../value-objects/suggestion-id'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id'

export interface CategorySuggestionRepository {
  save(suggestion: CategorySuggestion): Promise<void>
  findById(id: SuggestionId): Promise<CategorySuggestion | null>
  findByExpenseId(expenseId: ExpenseId, workspaceId: WorkspaceId): Promise<CategorySuggestion[]>
  findPendingByWorkspaceId(workspaceId: WorkspaceId, limit?: number): Promise<CategorySuggestion[]>
  findByWorkspaceId(workspaceId: WorkspaceId, limit?: number): Promise<CategorySuggestion[]>
  delete(id: SuggestionId): Promise<void>
}
