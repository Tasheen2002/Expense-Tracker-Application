import { SpendingLimitId } from '../value-objects/spending-limit-id';
import { BudgetPeriodType } from '../enums/budget-period-type';
import { Decimal } from '@prisma/client/runtime/library';
import {
  InvalidAmountError,
  InvalidCurrencyError,
  BudgetAlreadyActiveError,
  SpendingLimitAlreadyInactiveError,
} from '../errors/budget.errors';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';

export interface SpendingLimitDTO {
  limitId: string;
  workspaceId: string;
  userId: string | null;
  categoryId: string | null;
  limitAmount: string;
  currency: string;
  periodType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}


// ============================================================================
// Domain Events
// ============================================================================

export class SpendingLimitCreatedEvent extends DomainEvent {
  constructor(
    public readonly limitId: string,
    public readonly workspaceId: string,
    public readonly limitAmount: string,
    public readonly periodType: string
  ) {
    super(limitId, 'SpendingLimit');
  }

  get eventType(): string {
    return 'spending-limit.created';
  }

  getPayload(): Record<string, unknown> {
    return {
      limitId: this.limitId,
      workspaceId: this.workspaceId,
      limitAmount: this.limitAmount,
      periodType: this.periodType,
    };
  }
}

export class SpendingLimitUpdatedEvent extends DomainEvent {
  constructor(
    public readonly limitId: string,
    public readonly workspaceId: string,
    public readonly oldAmount: string,
    public readonly newAmount: string
  ) {
    super(limitId, 'SpendingLimit');
  }

  get eventType(): string {
    return 'spending-limit.updated';
  }

  getPayload(): Record<string, unknown> {
    return {
      limitId: this.limitId,
      workspaceId: this.workspaceId,
      oldAmount: this.oldAmount,
      newAmount: this.newAmount,
    };
  }
}

export class SpendingLimitActivatedEvent extends DomainEvent {
  constructor(
    public readonly limitId: string,
    public readonly workspaceId: string
  ) {
    super(limitId, 'SpendingLimit');
  }

  get eventType(): string {
    return 'spending-limit.activated';
  }

  getPayload(): Record<string, unknown> {
    return {
      limitId: this.limitId,
      workspaceId: this.workspaceId,
    };
  }
}

export class SpendingLimitDeactivatedEvent extends DomainEvent {
  constructor(
    public readonly limitId: string,
    public readonly workspaceId: string
  ) {
    super(limitId, 'SpendingLimit');
  }

  get eventType(): string {
    return 'spending-limit.deactivated';
  }

  getPayload(): Record<string, unknown> {
    return {
      limitId: this.limitId,
      workspaceId: this.workspaceId,
    };
  }
}

export class SpendingLimitDeletedEvent extends DomainEvent {
  constructor(
    public readonly limitId: string,
    public readonly workspaceId: string
  ) {
    super(limitId, 'SpendingLimit');
  }

  get eventType(): string {
    return 'spending-limit.deleted';
  }

  getPayload(): Record<string, unknown> {
    return {
      limitId: this.limitId,
      workspaceId: this.workspaceId,
    };
  }
}

export interface SpendingLimitProps {
  id: SpendingLimitId;
  workspaceId: string;
  userId: string | null;
  categoryId: string | null;
  limitAmount: Decimal;
  currency: string;
  periodType: BudgetPeriodType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSpendingLimitData {
  workspaceId: string;
  userId?: string;
  categoryId?: string;
  limitAmount: number | string | Decimal;
  currency: string;
  periodType: BudgetPeriodType;
}


export class SpendingLimit extends AggregateRoot {
  private constructor(private props: SpendingLimitProps) {
    super();
  }

  static create(data: CreateSpendingLimitData): SpendingLimit {
    // Validate limit amount
    const limitAmount =
      typeof data.limitAmount === 'number' ||
      typeof data.limitAmount === 'string'
        ? new Decimal(data.limitAmount)
        : data.limitAmount;

    // ...
    if (limitAmount.isNegative() || limitAmount.isZero()) {
      throw new InvalidAmountError('Limit amount must be greater than zero');
    }

    if (limitAmount.decimalPlaces() > 2) {
      throw new InvalidAmountError(
        'Limit amount cannot have more than 2 decimal places'
      );
    }

    // Validate currency
    if (!data.currency || data.currency.length !== 3) {
      throw new InvalidCurrencyError(
        'Currency must be a valid 3-letter ISO code'
      );
    }

    const now = new Date();

    const spendingLimit = new SpendingLimit({
      id: SpendingLimitId.create(),
      workspaceId: data.workspaceId,
      userId: data.userId || null,
      categoryId: data.categoryId || null,
      limitAmount,
      currency: data.currency.toUpperCase(),
      periodType: data.periodType,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    spendingLimit.addDomainEvent(
      new SpendingLimitCreatedEvent(
        spendingLimit.id.getValue(),
        data.workspaceId,
        limitAmount.toString(),
        data.periodType
      )
    );

    return spendingLimit;
  }

  static fromPersistence(props: SpendingLimitProps): SpendingLimit {
    return new SpendingLimit(props);
  }

  // Getters
  get id(): SpendingLimitId {
    return this.props.id;
  }

  get workspaceId(): string {
    return this.props.workspaceId;
  }

  get userId(): string | null {
    return this.props.userId;
  }

  get categoryId(): string | null {
    return this.props.categoryId;
  }

  get limitAmount(): Decimal {
    return this.props.limitAmount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get periodType(): BudgetPeriodType {
    return this.props.periodType;
  }

  get active(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business logic methods
  updateLimitAmount(amount: number | string | Decimal): void {
    const newAmount =
      typeof amount === 'number' || typeof amount === 'string'
        ? new Decimal(amount)
        : amount;

    if (newAmount.isNegative() || newAmount.isZero()) {
      throw new InvalidAmountError('Limit amount must be greater than zero');
    }

    if (newAmount.decimalPlaces() > 2) {
      throw new InvalidAmountError(
        'Limit amount cannot have more than 2 decimal places'
      );
    }

    const oldAmount = this.props.limitAmount;
    this.props.limitAmount = newAmount;
    this.props.updatedAt = new Date();

    if (!oldAmount.equals(newAmount)) {
      this.addDomainEvent(
        new SpendingLimitUpdatedEvent(
          this.id.getValue(),
          this.workspaceId,
          oldAmount.toString(),
          newAmount.toString()
        )
      );
    }
  }

  // ...

  activate(): void {
    if (this.props.isActive) {
      throw new BudgetAlreadyActiveError('Spending limit is already active');
    }
    this.props.isActive = true;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new SpendingLimitActivatedEvent(
        this.id.getValue(),
        this.workspaceId
      )
    );
  }

  deactivate(): void {
    if (!this.props.isActive) {
      throw new SpendingLimitAlreadyInactiveError(this.id.getValue());
    }
    this.props.isActive = false;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new SpendingLimitDeactivatedEvent(
        this.id.getValue(),
        this.workspaceId
      )
    );
  }

  markAsDeleted(): void {
    this.addDomainEvent(
      new SpendingLimitDeletedEvent(
        this.id.getValue(),
        this.workspaceId
      )
    );
  }

  isWorkspaceWide(): boolean {
    return this.props.userId === null && this.props.categoryId === null;
  }

  isUserSpecific(): boolean {
    return this.props.userId !== null;
  }

  isCategorySpecific(): boolean {
    return this.props.categoryId !== null;
  }

  appliesTo(userId?: string, categoryId?: string): boolean {
    // Workspace-wide limit applies to everyone
    if (this.isWorkspaceWide()) {
      return true;
    }

    // User-specific limit
    if (this.props.userId && userId) {
      if (this.props.userId !== userId) {
        return false;
      }
      // If also category-specific, check category too
      if (this.props.categoryId && categoryId) {
        return this.props.categoryId === categoryId;
      }
      // User matches and no category restriction
      return !this.props.categoryId;
    }

    // Category-specific limit (any user)
    if (this.props.categoryId && categoryId) {
      return this.props.categoryId === categoryId;
    }

    return false;
  }

  equals(other: SpendingLimit): boolean {
    return this.props.id.equals(other.props.id);
  }

  static toDTO(limit: SpendingLimit): SpendingLimitDTO {
    return {
      limitId: limit.id.getValue(),
      workspaceId: limit.workspaceId,
      userId: limit.userId,
      categoryId: limit.categoryId,
      limitAmount: limit.limitAmount.toString(),
      currency: limit.currency,
      periodType: limit.periodType,
      isActive: limit.active,
      createdAt: limit.createdAt.toISOString(),
      updatedAt: limit.updatedAt.toISOString(),
    };
  }

}
