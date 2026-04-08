import { ICategorySuggestionRepository } from '../../domain/repositories/category-suggestion.repository'
import { CategorySuggestion, CategorySuggestionDTO } from '../../domain/entities/category-suggestion.entity'
import { SuggestionId } from '../../domain/value-objects/suggestion-id'
import { WorkspaceId } from '../../../identity-workspace'
import { ExpenseId, CategoryId } from '../../../expense-ledger'
import { ConfidenceScore } from '../../domain/value-objects/confidence-score'
import { SuggestionNotFoundError } from '../../domain/errors/categorization-rules.errors'
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface'

export class CategorySuggestionService {
  constructor(
    private readonly suggestionRepository: ICategorySuggestionRepository
  ) {}

  async createSuggestion(params: {
    workspaceId: WorkspaceId
    expenseId: ExpenseId
    suggestedCategoryId: CategoryId
    confidence: ConfidenceScore
    reason?: string
  }): Promise<CategorySuggestionDTO> {
    const suggestion = CategorySuggestion.create({
      workspaceId: params.workspaceId,
      expenseId: params.expenseId,
      suggestedCategoryId: params.suggestedCategoryId,
      confidence: params.confidence,
      reason: params.reason,
    })

    await this.suggestionRepository.save(suggestion)
    return CategorySuggestion.toDTO(suggestion)
  }

  async acceptSuggestion(suggestionId: SuggestionId, workspaceId: WorkspaceId): Promise<CategorySuggestionDTO> {
    const suggestion = await this.suggestionRepository.findById(suggestionId, workspaceId)

    if (!suggestion) {
      throw new SuggestionNotFoundError(suggestionId.getValue())
    }

    suggestion.accept()
    await this.suggestionRepository.save(suggestion)
    return CategorySuggestion.toDTO(suggestion)
  }

  async rejectSuggestion(suggestionId: SuggestionId, workspaceId: WorkspaceId): Promise<CategorySuggestionDTO> {
    const suggestion = await this.suggestionRepository.findById(suggestionId, workspaceId)

    if (!suggestion) {
      throw new SuggestionNotFoundError(suggestionId.getValue())
    }

    suggestion.reject()
    await this.suggestionRepository.save(suggestion)
    return CategorySuggestion.toDTO(suggestion)
  }

  async getSuggestionById(suggestionId: SuggestionId, workspaceId: WorkspaceId): Promise<CategorySuggestionDTO> {
    const suggestion = await this.suggestionRepository.findById(suggestionId, workspaceId)

    if (!suggestion) {
      throw new SuggestionNotFoundError(suggestionId.getValue())
    }

    return CategorySuggestion.toDTO(suggestion)
  }

  async getSuggestionsByExpenseId(
    expenseId: ExpenseId,
    workspaceId: WorkspaceId
  ): Promise<PaginatedResult<CategorySuggestionDTO>> {
    const result = await this.suggestionRepository.findByExpenseId(expenseId, workspaceId)
    return {
      items: result.items.map(CategorySuggestion.toDTO),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    }
  }

  async getPendingSuggestionsByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: { limit?: number; offset?: number },
  ): Promise<PaginatedResult<CategorySuggestionDTO>> {
    const result = await this.suggestionRepository.findPendingByWorkspaceId(workspaceId, options)
    return {
      items: result.items.map(CategorySuggestion.toDTO),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    }
  }

  async getSuggestionsByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: { limit?: number; offset?: number },
  ): Promise<PaginatedResult<CategorySuggestionDTO>> {
    const result = await this.suggestionRepository.findByWorkspaceId(workspaceId, options)
    return {
      items: result.items.map(CategorySuggestion.toDTO),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    }
  }

  async deleteSuggestion(suggestionId: SuggestionId, workspaceId: WorkspaceId): Promise<void> {
    const suggestion = await this.suggestionRepository.findById(suggestionId, workspaceId)

    if (!suggestion) {
      throw new SuggestionNotFoundError(suggestionId.getValue())
    }

    suggestion.markAsDeleted()
    await this.suggestionRepository.delete(suggestionId)
  }
}
