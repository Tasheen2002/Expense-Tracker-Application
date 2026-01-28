import { SuggestionId } from '../value-objects/suggestion-id'
import { ConfidenceScore } from '../value-objects/confidence-score'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { ExpenseId } from '../../../expense-ledger/domain/value-objects/expense-id'
import { CategoryId } from '../../../expense-ledger/domain/value-objects/category-id'

export class CategorySuggestion {
  private id: SuggestionId
  private workspaceId: WorkspaceId
  private expenseId: ExpenseId
  private suggestedCategoryId: CategoryId
  private confidence: ConfidenceScore
  private reason: string | null
  private isAccepted: boolean | null
  private createdAt: Date
  private respondedAt: Date | null

  private constructor(props: {
    id: SuggestionId
    workspaceId: WorkspaceId
    expenseId: ExpenseId
    suggestedCategoryId: CategoryId
    confidence: ConfidenceScore
    reason: string | null
    isAccepted: boolean | null
    createdAt: Date
    respondedAt: Date | null
  }) {
    this.id = props.id
    this.workspaceId = props.workspaceId
    this.expenseId = props.expenseId
    this.suggestedCategoryId = props.suggestedCategoryId
    this.confidence = props.confidence
    this.reason = props.reason
    this.isAccepted = props.isAccepted
    this.createdAt = props.createdAt
    this.respondedAt = props.respondedAt
  }

  static create(props: {
    workspaceId: WorkspaceId
    expenseId: ExpenseId
    suggestedCategoryId: CategoryId
    confidence: ConfidenceScore
    reason?: string
  }): CategorySuggestion {
    if (props.reason && props.reason.length > 500) {
      throw new Error('Suggestion reason cannot exceed 500 characters')
    }

    return new CategorySuggestion({
      id: SuggestionId.create(),
      workspaceId: props.workspaceId,
      expenseId: props.expenseId,
      suggestedCategoryId: props.suggestedCategoryId,
      confidence: props.confidence,
      reason: props.reason?.trim() || null,
      isAccepted: null,
      createdAt: new Date(),
      respondedAt: null,
    })
  }

  static reconstitute(props: {
    id: SuggestionId
    workspaceId: WorkspaceId
    expenseId: ExpenseId
    suggestedCategoryId: CategoryId
    confidence: ConfidenceScore
    reason: string | null
    isAccepted: boolean | null
    createdAt: Date
    respondedAt: Date | null
  }): CategorySuggestion {
    return new CategorySuggestion(props)
  }

  // Actions
  accept(): void {
    if (this.isAccepted !== null) {
      throw new Error('Suggestion has already been responded to')
    }
    this.isAccepted = true
    this.respondedAt = new Date()
  }

  reject(): void {
    if (this.isAccepted !== null) {
      throw new Error('Suggestion has already been responded to')
    }
    this.isAccepted = false
    this.respondedAt = new Date()
  }

  // Query methods
  isPending(): boolean {
    return this.isAccepted === null
  }

  wasAccepted(): boolean {
    return this.isAccepted === true
  }

  wasRejected(): boolean {
    return this.isAccepted === false
  }

  // Getters
  getId(): SuggestionId {
    return this.id
  }

  getWorkspaceId(): WorkspaceId {
    return this.workspaceId
  }

  getExpenseId(): ExpenseId {
    return this.expenseId
  }

  getSuggestedCategoryId(): CategoryId {
    return this.suggestedCategoryId
  }

  getConfidence(): ConfidenceScore {
    return this.confidence
  }

  getReason(): string | null {
    return this.reason
  }

  getIsAccepted(): boolean | null {
    return this.isAccepted
  }

  getCreatedAt(): Date {
    return this.createdAt
  }

  getRespondedAt(): Date | null {
    return this.respondedAt
  }
}
