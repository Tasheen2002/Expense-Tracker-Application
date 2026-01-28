import { PrismaClient } from '@prisma/client'
import { CategorySuggestionRepository } from '../../domain/repositories/category-suggestion.repository'
import { CategorySuggestion } from '../../domain/entities/category-suggestion.entity'
import { SuggestionId } from '../../domain/value-objects/suggestion-id'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id'
import { CategoryId } from '../../../expense-ledger/domain/value-objects/category-id'
import { ConfidenceScore } from '../../domain/value-objects/confidence-score'

export class PrismaCategorySuggestionRepository implements CategorySuggestionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(suggestion: CategorySuggestion): Promise<void> {
    const data = {
      id: suggestion.getId().getValue(),
      workspaceId: suggestion.getWorkspaceId().getValue(),
      expenseId: suggestion.getExpenseId().getValue(),
      suggestedCategoryId: suggestion.getSuggestedCategoryId().getValue(),
      confidence: suggestion.getConfidence().getValue(),
      reason: suggestion.getReason(),
      isAccepted: suggestion.getIsAccepted(),
      createdAt: suggestion.getCreatedAt(),
      respondedAt: suggestion.getRespondedAt(),
    }

    await this.prisma.categorySuggestion.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  }

  async findById(id: SuggestionId): Promise<CategorySuggestion | null> {
    const suggestion = await this.prisma.categorySuggestion.findUnique({
      where: { id: id.getValue() },
    })

    if (!suggestion) {
      return null
    }

    return this.toDomain(suggestion)
  }

  async findByExpenseId(
    expenseId: ExpenseId,
    workspaceId: WorkspaceId
  ): Promise<CategorySuggestion[]> {
    const suggestions = await this.prisma.categorySuggestion.findMany({
      where: {
        expenseId: expenseId.getValue(),
        workspaceId: workspaceId.getValue(),
      },
      orderBy: { createdAt: 'desc' },
    })

    return suggestions.map((suggestion) => this.toDomain(suggestion))
  }

  async findPendingByWorkspaceId(
    workspaceId: WorkspaceId,
    limit?: number
  ): Promise<CategorySuggestion[]> {
    const suggestions = await this.prisma.categorySuggestion.findMany({
      where: {
        workspaceId: workspaceId.getValue(),
        isAccepted: null,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return suggestions.map((suggestion) => this.toDomain(suggestion))
  }

  async findByWorkspaceId(
    workspaceId: WorkspaceId,
    limit?: number
  ): Promise<CategorySuggestion[]> {
    const suggestions = await this.prisma.categorySuggestion.findMany({
      where: { workspaceId: workspaceId.getValue() },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return suggestions.map((suggestion) => this.toDomain(suggestion))
  }

  async delete(id: SuggestionId): Promise<void> {
    await this.prisma.categorySuggestion.delete({
      where: { id: id.getValue() },
    })
  }

  private toDomain(raw: any): CategorySuggestion {
    return CategorySuggestion.reconstitute({
      id: SuggestionId.fromString(raw.id),
      workspaceId: WorkspaceId.fromString(raw.workspaceId),
      expenseId: ExpenseId.fromString(raw.expenseId),
      suggestedCategoryId: CategoryId.fromString(raw.suggestedCategoryId),
      confidence: ConfidenceScore.create(raw.confidence),
      reason: raw.reason,
      isAccepted: raw.isAccepted,
      createdAt: raw.createdAt,
      respondedAt: raw.respondedAt,
    })
  }
}
