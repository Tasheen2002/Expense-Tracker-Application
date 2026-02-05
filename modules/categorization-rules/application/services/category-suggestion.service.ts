import { CategorySuggestionRepository } from '../../domain/repositories/category-suggestion.repository'
import { CategorySuggestion } from '../../domain/entities/category-suggestion.entity'
import { SuggestionId } from '../../domain/value-objects/suggestion-id'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id'
import { CategoryId } from '../../../expense-ledger/domain/value-objects/category-id'
import { ConfidenceScore } from '../../domain/value-objects/confidence-score'
import { SuggestionNotFoundError } from '../../domain/errors/categorization-rules.errors'
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface'

export class CategorySuggestionService {
  constructor(
    private readonly suggestionRepository: CategorySuggestionRepository
  ) {}

  async createSuggestion(params: {
    workspaceId: WorkspaceId
    expenseId: ExpenseId
    suggestedCategoryId: CategoryId
    confidence: ConfidenceScore
    reason?: string
  }): Promise<CategorySuggestion> {
    const suggestion = CategorySuggestion.create({
      workspaceId: params.workspaceId,
      expenseId: params.expenseId,
      suggestedCategoryId: params.suggestedCategoryId,
      confidence: params.confidence,
      reason: params.reason,
    })

    await this.suggestionRepository.save(suggestion)
    return suggestion
  }

  async acceptSuggestion(suggestionId: SuggestionId): Promise<CategorySuggestion> {
    const suggestion = await this.suggestionRepository.findById(suggestionId)

    if (!suggestion) {
      throw new SuggestionNotFoundError(suggestionId.getValue())
    }

    suggestion.accept()
    await this.suggestionRepository.save(suggestion)
    return suggestion
  }

  async rejectSuggestion(suggestionId: SuggestionId): Promise<CategorySuggestion> {
    const suggestion = await this.suggestionRepository.findById(suggestionId)

    if (!suggestion) {
      throw new SuggestionNotFoundError(suggestionId.getValue())
    }

    suggestion.reject()
    await this.suggestionRepository.save(suggestion)
    return suggestion
  }

  async getSuggestionById(suggestionId: SuggestionId): Promise<CategorySuggestion> {
    const suggestion = await this.suggestionRepository.findById(suggestionId)

    if (!suggestion) {
      throw new SuggestionNotFoundError(suggestionId.getValue())
    }

    return suggestion
  }

  async getSuggestionsByExpenseId(
    expenseId: ExpenseId,
    workspaceId: WorkspaceId
  ): Promise<CategorySuggestion[]> {
    return this.suggestionRepository.findByExpenseId(expenseId, workspaceId)
  }

  async getPendingSuggestionsByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: { limit?: number; offset?: number },
  ): Promise<PaginatedResult<CategorySuggestion>> {
    return this.suggestionRepository.findPendingByWorkspaceId(workspaceId, options)
  }

  async getSuggestionsByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: { limit?: number; offset?: number },
  ): Promise<PaginatedResult<CategorySuggestion>> {
    return this.suggestionRepository.findByWorkspaceId(workspaceId, options)
  }

  async deleteSuggestion(suggestionId: SuggestionId): Promise<void> {
    const suggestion = await this.suggestionRepository.findById(suggestionId)

    if (!suggestion) {
      throw new SuggestionNotFoundError(suggestionId.getValue())
    }

    await this.suggestionRepository.delete(suggestionId)
  }
}
