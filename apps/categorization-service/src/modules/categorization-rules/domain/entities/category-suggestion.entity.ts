import { freezeDomainEvent } from '../events/freeze-domain-event';
import { SuggestionId } from '../value-objects/suggestion-id';
import { ConfidenceScore } from '../value-objects/confidence-score';
import { WorkspaceId, UserId } from '@core/domain/value-objects';
import {  ExpenseId, CategoryId  } from '@core/domain/value-objects';
import { InvalidSuggestionError, SuggestionAlreadyRespondedError } from '../errors/categorization-rules.errors';
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
    public readonly confidence: number,
    public readonly expenseOwnerId: string,
  ) {
    super(suggestionId, 'CategorySuggestion');
    freezeDomainEvent(this);
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
      expenseOwnerId: this.expenseOwnerId,
    };
  }
}

export class CategorySuggestionAcceptedEvent extends DomainEvent {
  constructor(
    public readonly suggestionId: string,
    public readonly expenseId: string,
    public readonly categoryId: string,
    public readonly workspaceId: string,
    public readonly acceptedBy: string,
    public readonly expenseVersion: number,
  ) {
    super(suggestionId, 'CategorySuggestion');
    freezeDomainEvent(this);
  }

  get eventType(): string {
    return 'CategorySuggestionAccepted';
  }

  getPayload(): Record<string, unknown> {
    return {
      suggestionId: this.suggestionId,
      expenseId: this.expenseId,
      categoryId: this.categoryId,
      workspaceId: this.workspaceId,
      acceptedBy: this.acceptedBy,
      expenseVersion: this.expenseVersion,
    };
  }
}

export class CategorySuggestionRejectedEvent extends DomainEvent {
  constructor(
    public readonly suggestionId: string,
    public readonly expenseId: string,
    public readonly workspaceId: string
  ) {
    super(suggestionId, 'CategorySuggestion');
    freezeDomainEvent(this);
  }

  get eventType(): string {
    return 'CategorySuggestionRejected';
  }

  getPayload(): Record<string, unknown> {
    return {
      suggestionId: this.suggestionId,
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
    };
  }
}

export class CategorySuggestionDeletedEvent extends DomainEvent {
  constructor(public readonly suggestionId: string, public readonly workspaceId: string) {
    super(suggestionId, 'CategorySuggestion');
    freezeDomainEvent(this);
  }

  get eventType(): string {
    return 'CategorySuggestionDeleted';
  }

  getPayload(): Record<string, unknown> {
    return { suggestionId: this.suggestionId, workspaceId: this.workspaceId };
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
  private props: CategorySuggestionProps;
  private deleted = false;

  private constructor(props: CategorySuggestionProps) {
    super();
    if (!(props.id instanceof SuggestionId) || !(props.workspaceId instanceof WorkspaceId) ||
        !(props.expenseId instanceof ExpenseId) || !(props.suggestedCategoryId instanceof CategoryId) ||
        !(props.confidence instanceof ConfidenceScore)) {
      throw new InvalidSuggestionError('Invalid suggestion identifiers or confidence');
    }
    if (props.reason != null && (typeof props.reason !== 'string' || props.reason.trim().length > 500)) {
      throw new InvalidSuggestionError('Suggestion reason cannot exceed 500 characters');
    }
    if (!(props.createdAt instanceof Date) || !Number.isFinite(props.createdAt.getTime()) ||
        ![null, true, false].includes(props.isAccepted) ||
        ((props.isAccepted === null) !== (props.respondedAt === null)) ||
        (props.respondedAt !== null && (!(props.respondedAt instanceof Date) ||
          !Number.isFinite(props.respondedAt.getTime()) || props.respondedAt < props.createdAt))) {
      throw new InvalidSuggestionError('Invalid suggestion response state or timestamps');
    }
    this.props = { ...props, reason: props.reason?.trim() || null,
      createdAt: new Date(props.createdAt), respondedAt: props.respondedAt ? new Date(props.respondedAt) : null };
  }

  static create(props: {
    expenseOwnerId: UserId;
    workspaceId: WorkspaceId;
    expenseId: ExpenseId;
    suggestedCategoryId: CategoryId;
    confidence: ConfidenceScore;
    reason?: string;
  }): CategorySuggestion {
    if (!(props.expenseOwnerId instanceof UserId)) throw new InvalidSuggestionError('Suggestion creation requires the verified expense owner');
    const suggestion = new CategorySuggestion({
      id: SuggestionId.create(),
      workspaceId: props.workspaceId,
      expenseId: props.expenseId,
      suggestedCategoryId: props.suggestedCategoryId,
      confidence: props.confidence,
      reason: props.reason ?? null,
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
        props.confidence.getValue(),
        props.expenseOwnerId.getValue()
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
  accept(acceptedBy: string, expenseVersion: number): void {
    if (this.deleted) throw new InvalidSuggestionError('Deleted suggestions cannot be responded to');
    if (this.props.isAccepted !== null) throw new SuggestionAlreadyRespondedError(this.id.getValue());
    if (!Number.isInteger(expenseVersion) || expenseVersion < 1 || expenseVersion > 2147483647) {
      throw new InvalidSuggestionError('Acceptance requires a positive expense version');
    }
    const actor = UserId.fromString(acceptedBy).getValue();
    this.props.isAccepted = true;
    this.props.respondedAt = new Date(Math.max(Date.now(), this.props.createdAt.getTime()));
    this.addDomainEvent(
      new CategorySuggestionAcceptedEvent(
        this.props.id.getValue(),
        this.props.expenseId.getValue(),
        this.props.suggestedCategoryId.getValue(),
        this.props.workspaceId.getValue(),
        actor,
        expenseVersion,
      )
    );
  }

  reject(): void {
    if (this.deleted) throw new InvalidSuggestionError('Deleted suggestions cannot be responded to');
    if (this.props.isAccepted !== null) throw new SuggestionAlreadyRespondedError(this.id.getValue());
    this.props.isAccepted = false;
    this.props.respondedAt = new Date(Math.max(Date.now(), this.props.createdAt.getTime()));
    this.addDomainEvent(
      new CategorySuggestionRejectedEvent(
        this.props.id.getValue(),
        this.props.expenseId.getValue(),
        this.props.workspaceId.getValue()
      )
    );
  }

  markAsDeleted(): void {
    if (this.deleted) return;
    this.deleted = true;
    this.addDomainEvent(
      new CategorySuggestionDeletedEvent(this.props.id.getValue(), this.workspaceId.getValue())
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
  override get domainEvents(): DomainEvent[] { return [...super.domainEvents]; }
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
    return new Date(this.props.createdAt);
  }
  get respondedAt(): Date | null {
    return this.props.respondedAt ? new Date(this.props.respondedAt) : null;
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
      createdAt: suggestion.createdAt,
      respondedAt: suggestion.respondedAt,
    };
  }
}
