import { BudgetId } from "../value-objects/budget-id";
import { BudgetPeriod } from "../value-objects/budget-period";
import { BudgetStatus, isValidStatusTransition } from "../enums/budget-status";
import { BudgetPeriodType } from "../enums/budget-period-type";
import { Decimal } from "@prisma/client/runtime/library";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";

// ============================================================================
// DOMAIN EVENTS
// ============================================================================

/**
 * Emitted when a budget threshold is exceeded.
 */
export class BudgetThresholdExceededEvent extends DomainEvent {
  constructor(
    public readonly budgetId: string,
    public readonly workspaceId: string,
    public readonly threshold: number,
    public readonly currentSpending: number,
    public readonly budgetLimit: number,
    public readonly currency: string,
  ) {
    super(budgetId, "Budget");
  }

  get eventType(): string {
    return "budget.threshold_exceeded";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      budgetId: this.budgetId,
      workspaceId: this.workspaceId,
      threshold: this.threshold,
      currentSpending: this.currentSpending,
      budgetLimit: this.budgetLimit,
      currency: this.currency,
    };
  }
}

/**
 * Emitted when a budget is fully consumed.
 */
export class BudgetExhaustedEvent extends DomainEvent {
  constructor(
    public readonly budgetId: string,
    public readonly workspaceId: string,
    public readonly budgetLimit: number,
    public readonly currency: string,
  ) {
    super(budgetId, "Budget");
  }

  get eventType(): string {
    return "budget.exhausted";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      budgetId: this.budgetId,
      workspaceId: this.workspaceId,
      budgetLimit: this.budgetLimit,
      currency: this.currency,
    };
  }
}

/**
 * Emitted when spending is recorded against a budget.
 */
export class BudgetSpendingRecordedEvent extends DomainEvent {
  constructor(
    public readonly budgetId: string,
    public readonly workspaceId: string,
    public readonly expenseId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly newTotalSpending: number,
  ) {
    super(budgetId, "Budget");
  }

  get eventType(): string {
    return "budget.spending_recorded";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      budgetId: this.budgetId,
      workspaceId: this.workspaceId,
      expenseId: this.expenseId,
      amount: this.amount,
      currency: this.currency,
      newTotalSpending: this.newTotalSpending,
    };
  }
}

/**
 * Emitted when a new budget is created.
 */
export class BudgetCreatedEvent extends DomainEvent {
  constructor(
    public readonly budgetId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly limit: number,
    public readonly currency: string,
    public readonly createdBy: string,
  ) {
    super(budgetId, "Budget");
  }

  get eventType(): string {
    return "budget.created";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      budgetId: this.budgetId,
      workspaceId: this.workspaceId,
      name: this.name,
      limit: this.limit,
      currency: this.currency,
      createdBy: this.createdBy,
    };
  }
}

// ============================================================================
// ENTITY
// ============================================================================

export interface BudgetProps {
  id: BudgetId;
  workspaceId: string;
  name: string;
  description: string | null;
  totalAmount: Decimal;
  currency: string;
  period: BudgetPeriod;
  status: BudgetStatus;
  createdBy: string;
  isRecurring: boolean;
  rolloverUnused: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBudgetData {
  workspaceId: string;
  name: string;
  description?: string;
  totalAmount: number | string | Decimal;
  currency: string;
  periodType: BudgetPeriodType;
  startDate: Date;
  endDate?: Date;
  createdBy: string;
  isRecurring?: boolean;
  rolloverUnused?: boolean;
}

export class Budget extends AggregateRoot {
  private constructor(private props: BudgetProps) {
    super();
  }

  static create(data: CreateBudgetData): Budget {
    // Validate name
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("Budget name is required");
    }
    if (data.name.length > 255) {
      throw new Error("Budget name cannot exceed 255 characters");
    }

    // Validate total amount
    const totalAmount =
      typeof data.totalAmount === "number" ||
      typeof data.totalAmount === "string"
        ? new Decimal(data.totalAmount)
        : data.totalAmount;

    if (totalAmount.isNegative() || totalAmount.isZero()) {
      throw new Error("Total amount must be greater than zero");
    }

    if (totalAmount.decimalPlaces() > 2) {
      throw new Error("Total amount cannot have more than 2 decimal places");
    }

    // Validate currency
    if (!data.currency || data.currency.length !== 3) {
      throw new Error("Currency must be a valid 3-letter ISO code");
    }

    // Create budget period
    const period = BudgetPeriod.create(
      data.startDate,
      data.periodType,
      data.endDate,
    );

    const now = new Date();

    const budget = new Budget({
      id: BudgetId.create(),
      workspaceId: data.workspaceId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      totalAmount,
      currency: data.currency.toUpperCase(),
      period,
      status: BudgetStatus.DRAFT,
      createdBy: data.createdBy,
      isRecurring: data.isRecurring ?? false,
      rolloverUnused: data.rolloverUnused ?? false,
      createdAt: now,
      updatedAt: now,
    });

    budget.addDomainEvent(
      new BudgetCreatedEvent(
        budget.getId().getValue(),
        budget.getWorkspaceId(),
        budget.getName(),
        budget.getTotalAmount().toNumber(),
        budget.getCurrency(),
        budget.getCreatedBy(),
      ),
    );

    return budget;
  }

  static fromPersistence(props: BudgetProps): Budget {
    return new Budget(props);
  }

  // Getters
  getId(): BudgetId {
    return this.props.id;
  }

  getWorkspaceId(): string {
    return this.props.workspaceId;
  }

  getName(): string {
    return this.props.name;
  }

  getDescription(): string | null {
    return this.props.description;
  }

  getTotalAmount(): Decimal {
    return this.props.totalAmount;
  }

  getCurrency(): string {
    return this.props.currency;
  }

  getPeriod(): BudgetPeriod {
    return this.props.period;
  }

  getStatus(): BudgetStatus {
    return this.props.status;
  }

  getCreatedBy(): string {
    return this.props.createdBy;
  }

  isRecurring(): boolean {
    return this.props.isRecurring;
  }

  shouldRolloverUnused(): boolean {
    return this.props.rolloverUnused;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business logic methods
  updateName(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new Error("Budget name is required");
    }
    if (newName.length > 255) {
      throw new Error("Budget name cannot exceed 255 characters");
    }
    this.props.name = newName.trim();
    this.props.updatedAt = new Date();
  }

  updateDescription(description: string | null): void {
    this.props.description = description?.trim() || null;
    this.props.updatedAt = new Date();
  }

  updateTotalAmount(amount: number | string | Decimal): void {
    const newAmount =
      typeof amount === "number" || typeof amount === "string"
        ? new Decimal(amount)
        : amount;

    if (newAmount.isNegative() || newAmount.isZero()) {
      throw new Error("Total amount must be greater than zero");
    }

    if (newAmount.decimalPlaces() > 2) {
      throw new Error("Total amount cannot have more than 2 decimal places");
    }

    this.props.totalAmount = newAmount;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    if (!isValidStatusTransition(this.props.status, BudgetStatus.ACTIVE)) {
      throw new Error(
        `Cannot activate budget with status ${this.props.status}`,
      );
    }
    this.props.status = BudgetStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  markAsExceeded(currentSpending: number): void {
    if (this.props.status !== BudgetStatus.ACTIVE) {
      throw new Error("Only active budgets can be marked as exceeded");
    }
    this.props.status = BudgetStatus.EXCEEDED;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BudgetThresholdExceededEvent(
        this.getId().getValue(),
        this.getWorkspaceId(),
        100, // 100% threshold exceeded
        currentSpending,
        this.getTotalAmount().toNumber(),
        this.getCurrency(),
      ),
    );
  }

  archive(): void {
    if (!isValidStatusTransition(this.props.status, BudgetStatus.ARCHIVED)) {
      throw new Error(`Cannot archive budget with status ${this.props.status}`);
    }
    this.props.status = BudgetStatus.ARCHIVED;
    this.props.updatedAt = new Date();
  }

  isActive(): boolean {
    return (
      this.props.status === BudgetStatus.ACTIVE && this.props.period.isActive()
    );
  }

  isDraft(): boolean {
    return this.props.status === BudgetStatus.DRAFT;
  }

  isArchived(): boolean {
    return this.props.status === BudgetStatus.ARCHIVED;
  }

  isExceeded(): boolean {
    return this.props.status === BudgetStatus.EXCEEDED;
  }

  hasExpired(): boolean {
    return this.props.period.hasEnded();
  }

  equals(other: Budget): boolean {
    return this.props.id.equals(other.props.id);
  }
}
