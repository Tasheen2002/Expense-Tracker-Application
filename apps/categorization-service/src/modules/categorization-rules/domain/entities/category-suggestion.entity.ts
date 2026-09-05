import { SuggestionId } from '../value-objects/suggestion-id';
import { ConfidenceScore } from '../value-objects/confidence-score';
import {  WorkspaceId  } from '@core/domain/value-objects';
import {  ExpenseId, CategoryId  } from '@core/domain/value-objects';
import { InvalidSuggestionError } from '../errors/categorization-rules.errors';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';

export interface CategorySuggestionDTO {
  id: string;
  workspaceId: string;
  expenseId: string;
  suggestedCategoryId: string;
  confidence: number;
  reason: string | null;
  isAccepted: boolean | null;
  createdAt: Date;
  respondedAt: Date | null;
}

// ============================================================================
// Domain Events
// ============================================================================

export class CategorySuggestionCreatedEvent extends DomainEvent {
  constructor(
    public readonly suggestionId: string,
    public readonly workspaceId: string,
    public readonly expenseId: string,
    public readonly suggestedCategoryId: string,
    public readonly confidence: number
  ) {
    super(suggestionId, 'CategorySuggestion');
  }

  get eventType(): string {
    return 'CategorySuggestionCreated';
  }

  getPayload(): Record<string, unknown> {
    return {
      suggestionId: this.suggestionId,
      workspaceId: this.workspaceId,
      expenseId: this.expenseId,
      suggestedCategoryId: this.suggestedCategoryId,
      confidence: this.confidence,
    };
  }
}

export class CategorySuggestionAcceptedEvent extends DomainEvent {
  constructor(
    public readonly suggestionId: string,
    public readonly expenseId: string,
    public readonly categoryId: string
  ) {
    super(suggestionId, 'CategorySuggestion');
  }

  get eventType(): string {
    return 'CategorySuggestionAccepted';
  }

  getPayload(): Record<string, unknown> {
    return {
      suggestionId: this.suggestionId,
      expenseId: this.expenseId,
      categoryId: this.categoryId,
    };
  }
}

export class CategorySuggestionRejectedEvent extends DomainEvent {
  constructor(
    public readonly suggestionId: string,
    public readonly expenseId: string
  ) {
    super(suggestionId, 'CategorySuggestion');
  }

  get eventType(): string {
    return 'CategorySuggestionRejected';
  }

  getPayload(): Record<string, unknown> {
    return {
      suggestionId: this.suggestionId,
      expenseId: this.expenseId,
    };
  }
}

export class CategorySuggestionDeletedEvent extends DomainEvent {
  constructor(public readonly suggestionId: string) {
    super(suggestionId, 'CategorySuggestion');
  }

  get eventType(): string {
    return 'CategorySuggestionDeleted';
  }

  getPayload(): Record<string, unknown> {
    return { suggestionId: this.suggestionId };
  }
}

// ============================================================================
// Entity
// ============================================================================

interface CategorySuggestionProps {
  id: SuggestionId;
  workspaceId: WorkspaceId;
  expenseId: ExpenseId;
  suggestedCategoryId: CategoryId;
  confidence: ConfidenceScore;
  reason: string | null;
  isAccepted: boolean | null;
  createdAt: Date;
  respondedAt: Date | null;
}

export class CategorySuggestion extends AggregateRoot {
  private constructor(private props: CategorySuggestionProps) {
    super();
  }

  static create(props: {
    workspaceId: WorkspaceId;
    expenseId: ExpenseId;
    suggestedCategoryId: CategoryId;
    confidence: ConfidenceScore;
    reason?: string;
  }): CategorySuggestion {
    if (props.reason && props.reason.length > 500) {
      throw new InvalidSuggestionError(
        'Suggestion reason cannot exceed 500 characters'
      );
    }

    const suggestion = new CategorySuggestion({
      id: SuggestionId.create(),
      workspaceId: props.workspaceId,
      expenseId: props.expenseId,
      suggestedCategoryId: props.suggestedCategoryId,
      confidence: props.confidence,
      reason: props.reason?.trim() || null,
      isAccepted: null,
      createdAt: new Date(),
      respondedAt: null,
    });

    suggestion.addDomainEvent(
      new CategorySuggestionCreatedEvent(
        suggestion.props.id.getValue(),
        props.workspaceId.getValue(),
        props.expenseId.getValue(),
        props.suggestedCategoryId.getValue(),
        props.confidence.getValue()
      )
    );

    return suggestion;
  }

  static fromPersistence(props: {
    id: SuggestionId;
    workspaceId: WorkspaceId;
    expenseId: ExpenseId;
    suggestedCategoryId: CategoryId;
    confidence: ConfidenceScore;
    reason: string | null;
    isAccepted: boolean | null;
    createdAt: Date;
    respondedAt: Date | null;
  }): CategorySuggestion {
    return new CategorySuggestion(props);
  }

  // Actions
  accept(): void {
    if (this.props.isAccepted !== null) {
      throw new InvalidSuggestionError(
        'Suggestion has already been responded to'
      );
    }
    this.props.isAccepted = true;
    this.props.respondedAt = new Date();
    this.addDomainEvent(
      new CategorySuggestionAcceptedEvent(
        this.props.id.getValue(),
        this.props.expenseId.getValue(),
        this.props.suggestedCategoryId.getValue()
      )
    );
  }

  reject(): void {
    if (this.props.isAccepted !== null) {
      throw new InvalidSuggestionError(
        'Suggestion has already been responded to'
      );
    }
    this.props.isAccepted = false;
    this.props.respondedAt = new Date();
    this.addDomainEvent(
      new CategorySuggestionRejectedEvent(
        this.props.id.getValue(),
        this.props.expenseId.getValue()
      )
    );
  }

  markAsDeleted(): void {
    this.addDomainEvent(
      new CategorySuggestionDeletedEvent(this.props.id.getValue())
    );
  }

  // Query methods
  isPending(): boolean {
    return this.props.isAccepted === null;
  }
  wasAccepted(): boolean {
    return this.props.isAccepted === true;
  }
  wasRejected(): boolean {
    return this.props.isAccepted === false;
  }

  // Getters
  get id(): SuggestionId {
    return this.props.id;
  }
  get workspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }
  get expenseId(): ExpenseId {
    return this.props.expenseId;
  }
  get suggestedCategoryId(): CategoryId {
    return this.props.suggestedCategoryId;
  }
  get confidence(): ConfidenceScore {
    return this.props.confidence;
  }
  get reason(): string | null {
    return this.props.reason;
  }
  get isAccepted(): boolean | null {
    return this.props.isAccepted;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get respondedAt(): Date | null {
    return this.props.respondedAt;
  }

  static toDTO(suggestion: CategorySuggestion): CategorySuggestionDTO {
    return {
      id: suggestion.props.id.getValue(),
      workspaceId: suggestion.props.workspaceId.getValue(),
      expenseId: suggestion.props.expenseId.getValue(),
      suggestedCategoryId: suggestion.props.suggestedCategoryId.getValue(),
      confidence: suggestion.props.confidence.getValue(),
      reason: suggestion.props.reason,
      isAccepted: suggestion.props.isAccepted,
      createdAt: suggestion.props.createdAt,
      respondedAt: suggestion.props.respondedAt,
    };
  }
}
