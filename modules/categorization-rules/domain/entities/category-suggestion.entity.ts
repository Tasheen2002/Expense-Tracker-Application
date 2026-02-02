import { SuggestionId } from "../value-objects/suggestion-id";
import { ConfidenceScore } from "../value-objects/confidence-score";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { ExpenseId } from "../../../expense-ledger/domain/value-objects/expense-id";
import { CategoryId } from "../../../expense-ledger/domain/value-objects/category-id";
import { InvalidSuggestionError } from "../errors/categorization-rules.errors";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events/domain-event";

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
  ) {
    super(suggestionId, "CategorySuggestion");
  }

  get eventType(): string {
    return "CategorySuggestionCreated";
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
    public readonly categoryId: string,
  ) {
    super(suggestionId, "CategorySuggestion");
  }

  get eventType(): string {
    return "CategorySuggestionAccepted";
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
    public readonly expenseId: string,
  ) {
    super(suggestionId, "CategorySuggestion");
  }

  get eventType(): string {
    return "CategorySuggestionRejected";
  }

  getPayload(): Record<string, unknown> {
    return {
      suggestionId: this.suggestionId,
      expenseId: this.expenseId,
    };
  }
}

// ============================================================================
// Entity
// ============================================================================

export class CategorySuggestion extends AggregateRoot {
  private id: SuggestionId;
  private workspaceId: WorkspaceId;
  private expenseId: ExpenseId;
  private suggestedCategoryId: CategoryId;
  private confidence: ConfidenceScore;
  private reason: string | null;
  private isAccepted: boolean | null;
  private createdAt: Date;
  private respondedAt: Date | null;

  private constructor(props: {
    id: SuggestionId;
    workspaceId: WorkspaceId;
    expenseId: ExpenseId;
    suggestedCategoryId: CategoryId;
    confidence: ConfidenceScore;
    reason: string | null;
    isAccepted: boolean | null;
    createdAt: Date;
    respondedAt: Date | null;
  }) {
    super();
    this.id = props.id;
    this.workspaceId = props.workspaceId;
    this.expenseId = props.expenseId;
    this.suggestedCategoryId = props.suggestedCategoryId;
    this.confidence = props.confidence;
    this.reason = props.reason;
    this.isAccepted = props.isAccepted;
    this.createdAt = props.createdAt;
    this.respondedAt = props.respondedAt;
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
        "Suggestion reason cannot exceed 500 characters",
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
        suggestion.id.getValue(),
        props.workspaceId.getValue(),
        props.expenseId.getValue(),
        props.suggestedCategoryId.getValue(),
        props.confidence.getValue(),
      ),
    );

    return suggestion;
  }

  static reconstitute(props: {
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
    if (this.isAccepted !== null) {
      throw new InvalidSuggestionError(
        "Suggestion has already been responded to",
      );
    }
    this.isAccepted = true;
    this.respondedAt = new Date();
    this.addDomainEvent(
      new CategorySuggestionAcceptedEvent(
        this.id.getValue(),
        this.expenseId.getValue(),
        this.suggestedCategoryId.getValue(),
      ),
    );
  }

  reject(): void {
    if (this.isAccepted !== null) {
      throw new InvalidSuggestionError(
        "Suggestion has already been responded to",
      );
    }
    this.isAccepted = false;
    this.respondedAt = new Date();
    this.addDomainEvent(
      new CategorySuggestionRejectedEvent(
        this.id.getValue(),
        this.expenseId.getValue(),
      ),
    );
  }

  // Query methods
  isPending(): boolean {
    return this.isAccepted === null;
  }

  wasAccepted(): boolean {
    return this.isAccepted === true;
  }

  wasRejected(): boolean {
    return this.isAccepted === false;
  }

  // Getters
  getId(): SuggestionId {
    return this.id;
  }

  getWorkspaceId(): WorkspaceId {
    return this.workspaceId;
  }

  getExpenseId(): ExpenseId {
    return this.expenseId;
  }

  getSuggestedCategoryId(): CategoryId {
    return this.suggestedCategoryId;
  }

  getConfidence(): ConfidenceScore {
    return this.confidence;
  }

  getReason(): string | null {
    return this.reason;
  }

  getIsAccepted(): boolean | null {
    return this.isAccepted;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getRespondedAt(): Date | null {
    return this.respondedAt;
  }
}
