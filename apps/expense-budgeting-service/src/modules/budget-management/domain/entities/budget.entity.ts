import { BudgetId } from '../value-objects/budget-id';
import { BudgetPeriod } from '../value-objects/budget-period';
import { BudgetStatus, isValidStatusTransition } from '../enums/budget-status';
import { BudgetAllocationExceededError } from '../errors/budget.errors';
import {
  InvalidAmountError,
  InvalidBudgetStatusError,
  InvalidBudgetPeriodError,
} from '../errors/budget.errors';
import { BudgetPeriodType } from '../enums/budget-period-type';
import Decimal from 'decimal.js';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import {
  normalizeBudgetName,
  normalizeCurrency,
  normalizeDescription,
  normalizeRequiredId,
  parseMoney,
} from './entity-validation';

export interface BudgetDTO {
  budgetId: string;
  workspaceId: string;
  name: string;
  description: string | null;
  totalAmount: string;
  currency: string;
  period: {
    startDate: string;
    endDate: string;
    type: string;
  };
  status: string;
  createdBy: string;
  isRecurring: boolean;
  rolloverUnused: boolean;
  createdAt: string;
  updatedAt: string;
}


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
    public readonly createdBy: string
  ) {
    super(budgetId, 'Budget');
  }

  get eventType(): string {
    return 'budget.threshold_exceeded';
  }

  getPayload(): Record<string, unknown> {
    return {
      budgetId: this.budgetId,
      workspaceId: this.workspaceId,
      threshold: this.threshold,
      currentSpending: this.currentSpending,
      budgetLimit: this.budgetLimit,
      currency: this.currency,
      createdBy: this.createdBy,
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
    public readonly currency: string
  ) {
    super(budgetId, 'Budget');
  }

  get eventType(): string {
    return 'budget.exhausted';
  }

  getPayload(): Record<string, unknown> {
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
    public readonly newTotalSpending: number
  ) {
    super(budgetId, 'Budget');
  }

  get eventType(): string {
    return 'budget.spending_recorded';
  }

  getPayload(): Record<string, unknown> {
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
    public readonly createdBy: string
  ) {
    super(budgetId, 'Budget');
  }

  get eventType(): string {
    return 'budget.created';
  }

  getPayload(): Record<string, unknown> {
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

export class BudgetActivatedEvent extends DomainEvent {
  constructor(
    public readonly budgetId: string,
    public readonly workspaceId: string
  ) {
    super(budgetId, 'Budget');
  }

  get eventType(): string {
    return 'budget.activated';
  }

  getPayload(): Record<string, unknown> {
    return {
      budgetId: this.budgetId,
      workspaceId: this.workspaceId,
    };
  }
}

export class BudgetArchivedEvent extends DomainEvent {
  constructor(
    public readonly budgetId: string,
    public readonly workspaceId: string
  ) {
    super(budgetId, 'Budget');
  }

  get eventType(): string {
    return 'budget.archived';
  }

  getPayload(): Record<string, unknown> {
    return {
      budgetId: this.budgetId,
      workspaceId: this.workspaceId,
    };
  }
}

export class BudgetUpdatedEvent extends DomainEvent {
  constructor(
    public readonly budgetId: string,
    public readonly workspaceId: string,
    public readonly changes: {
      name?: string;
      totalAmount?: string;
      description?: string | null;
    }
  ) {
    super(budgetId, 'Budget');
  }

  get eventType(): string {
    return 'budget.updated';
  }

  getPayload(): Record<string, unknown> {
    return {
      budgetId: this.budgetId,
      workspaceId: this.workspaceId,
      changes: this.changes,
    };
  }
}

export class BudgetDeletedEvent extends DomainEvent {
  constructor(
    public readonly budgetId: string,
    public readonly workspaceId: string
  ) {
    super(budgetId, 'Budget');
  }

  get eventType(): string {
    return 'budget.deleted';
  }

  getPayload(): Record<string, unknown> {
    return {
      budgetId: this.budgetId,
      workspaceId: this.workspaceId,
    };
  }
}

/**
 * Emitted on the Budget aggregate when one of its allocations is deleted.
 */
export class AllocationDeletedEvent extends DomainEvent {
  constructor(
    public readonly budgetId: string,
    public readonly workspaceId: string,
    public readonly allocationId: string
  ) {
    super(budgetId, 'Budget');
  }

  get eventType(): string {
    return 'budget.allocation_deleted';
  }

  getPayload(): Record<string, unknown> {
    return {
      budgetId: this.budgetId,
      workspaceId: this.workspaceId,
      allocationId: this.allocationId,
    };
  }
}

/**
 * Emitted on the Budget aggregate when a budget alert is generated.
 */
export class AlertGeneratedEvent extends DomainEvent {
  constructor(
    public readonly budgetId: string,
    public readonly workspaceId: string,
    public readonly alertId: string,
    public readonly level: string
  ) {
    super(budgetId, 'Budget');
  }

  get eventType(): string {
    return 'budget.alert_generated';
  }

  getPayload(): Record<string, unknown> {
    return {
      budgetId: this.budgetId,
      workspaceId: this.workspaceId,
      alertId: this.alertId,
      level: this.level,
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
    this.props = {
      ...props,
      createdAt: new Date(props.createdAt.getTime()),
      updatedAt: new Date(props.updatedAt.getTime()),
    };
  }

  static create(data: CreateBudgetData): Budget {
    if (data.rolloverUnused && !data.isRecurring) {
      throw new InvalidBudgetPeriodError('Rollover requires a recurring budget');
    }
    const workspaceId = normalizeRequiredId(data.workspaceId, 'Workspace ID');
    const createdBy = normalizeRequiredId(data.createdBy, 'Creator ID');
    const name = normalizeBudgetName(data.name);
    const totalAmount = parseMoney(data.totalAmount, 'Total amount');
    const currency = normalizeCurrency(data.currency);
    const description = normalizeDescription(data.description);

    const now = new Date();
    const period = BudgetPeriod.create(
      data.startDate,
      data.periodType,
      data.endDate
    );

    const budget = new Budget({
      id: BudgetId.create(),
      workspaceId,
      name,
      description,
      totalAmount,
      currency,
      period,
      status: BudgetStatus.DRAFT,
      createdBy,
      isRecurring: data.isRecurring || false,
      rolloverUnused: data.rolloverUnused || false,
      createdAt: now,
      updatedAt: now,
    });

    budget.addDomainEvent(
      new BudgetCreatedEvent(
        budget.id.getValue(),
        workspaceId,
        name,
        totalAmount.toNumber(),
        currency,
        createdBy
      )
    );

    return budget;
  }

  static fromPersistence(props: BudgetProps): Budget {
    return new Budget(props);
  }

  updateName(newName: string): void {
    const name = normalizeBudgetName(newName);
    const oldName = this.props.name;
    if (oldName === name) return;
    this.props.name = name;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BudgetUpdatedEvent(this.id.getValue(), this.workspaceId, { name })
    );
  }

  updateTotalAmount(amount: number | string | Decimal): void {
    const newAmount = parseMoney(amount, 'Total amount');
    const oldAmount = this.props.totalAmount;
    if (oldAmount.equals(newAmount)) return;
    this.props.totalAmount = newAmount;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BudgetUpdatedEvent(this.id.getValue(), this.workspaceId, {
        totalAmount: newAmount.toString(),
      })
    );
  }

  updateDescription(description: string | null): void {
    const oldDescription = this.props.description;
    const newDescription = normalizeDescription(description);
    if (oldDescription === newDescription) return;
    this.props.description = newDescription;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BudgetUpdatedEvent(this.id.getValue(), this.workspaceId, {
        description: newDescription,
      })
    );
  }

  activate(): void {
    if (!isValidStatusTransition(this.props.status, BudgetStatus.ACTIVE)) {
      throw new InvalidBudgetStatusError(
        this.props.status,
        BudgetStatus.ACTIVE
      );
    }
    this.props.status = BudgetStatus.ACTIVE;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BudgetActivatedEvent(this.id.getValue(), this.workspaceId)
    );
  }

  markAsExceeded(currentSpending: number): void {
    if (this.props.status !== BudgetStatus.ACTIVE) {
      throw new InvalidBudgetStatusError(
        this.props.status,
        BudgetStatus.EXCEEDED
      );
    }
    const spent = parseMoney(currentSpending, 'Current spending', {
      allowZero: true,
      unbounded: true,
    });
    if (!spent.greaterThan(this.props.totalAmount)) {
      throw new InvalidAmountError('Current spending must exceed the budget total');
    }
    this.props.status = BudgetStatus.EXCEEDED;
    this.props.updatedAt = new Date();

    const limitNum = this.totalAmount.toNumber();
    const thresholdPercentage =
      limitNum > 0 ? (currentSpending / limitNum) * 100 : 100;

    this.addDomainEvent(
      new BudgetThresholdExceededEvent(
        this.id.getValue(),
        this.workspaceId,
        thresholdPercentage,
        currentSpending,
        limitNum,
        this.currency,
        this.createdBy
      )
    );
  }

  archive(): void {
    if (!isValidStatusTransition(this.props.status, BudgetStatus.ARCHIVED)) {
      throw new InvalidBudgetStatusError(
        this.props.status,
        BudgetStatus.ARCHIVED
      );
    }
    this.props.status = BudgetStatus.ARCHIVED;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new BudgetArchivedEvent(this.id.getValue(), this.workspaceId)
    );
  }

  markAsDeleted(): void {
    this.addDomainEvent(
      new BudgetDeletedEvent(this.id.getValue(), this.workspaceId)
    );
  }

  // Getters
  get id(): BudgetId {
    return this.props.id;
  }

  get workspaceId(): string {
    return this.props.workspaceId;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get totalAmount(): Decimal {
    return this.props.totalAmount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get period(): BudgetPeriod {
    return this.props.period;
  }

  get status(): BudgetStatus {
    return this.props.status;
  }

  get createdBy(): string {
    return this.props.createdBy;
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

  isRecurring(): boolean {
    return this.props.isRecurring;
  }

  shouldRolloverUnused(): boolean {
    return this.props.rolloverUnused;
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt.getTime());
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt.getTime());
  }

  recordAllocationDeleted(allocationId: string): void {
    this.addDomainEvent(
      new AllocationDeletedEvent(
        this.id.getValue(),
        this.workspaceId,
        allocationId
      )
    );
  }

  recordAlertGenerated(alertId: string, level: string): void {
    this.addDomainEvent(
      new AlertGeneratedEvent(
        this.id.getValue(),
        this.workspaceId,
        alertId,
        level
      )
    );
  }

  validateAllocationAmount(amount: Decimal, currentAllocated: Decimal): void {
    const allocation = parseMoney(amount, 'Allocation amount');
    const allocated = parseMoney(currentAllocated, 'Current allocated amount', {
      allowZero: true,
    });

    const projectedTotal = allocated.plus(allocation);

    if (projectedTotal.gt(this.props.totalAmount)) {
      throw new BudgetAllocationExceededError(
        this.props.id.getValue(),
        this.props.totalAmount.toNumber(),
        projectedTotal.toNumber()
      );
    }
  }

  equals(other: Budget): boolean {
    return this.props.id.equals(other.props.id);
  }

  static toDTO(budget: Budget): BudgetDTO {
    return {
      budgetId: budget.id.getValue(),
      workspaceId: budget.workspaceId,
      name: budget.name,
      description: budget.description,
      totalAmount: budget.totalAmount.toString(),
      currency: budget.currency,
      period: {
        startDate: budget.period.startDate.toISOString(),
        endDate: budget.period.endDate.toISOString(),
        type: budget.period.periodType,
      },
      status: budget.status,
      createdBy: budget.createdBy,
      isRecurring: budget.isRecurring(),
      rolloverUnused: budget.shouldRolloverUnused(),
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
    };
  }

}
