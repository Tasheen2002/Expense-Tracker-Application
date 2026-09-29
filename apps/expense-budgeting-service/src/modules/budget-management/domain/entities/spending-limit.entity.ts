import { SpendingLimitId } from '../value-objects/spending-limit-id';
import { BudgetPeriodType } from '../enums/budget-period-type';
import Decimal from 'decimal.js';
import {
  BudgetAlreadyActiveError,
  SpendingLimitAlreadyInactiveError,
  InvalidBudgetPeriodError,
} from '../errors/budget.errors';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import { normalizeCurrency, normalizeOptionalId, normalizeRequiredId, parseMoney } from './entity-validation';

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
    this.props = {
      ...props,
      createdAt: new Date(props.createdAt.getTime()),
      updatedAt: new Date(props.updatedAt.getTime()),
    };
  }

  static create(data: CreateSpendingLimitData): SpendingLimit {
    const workspaceId = normalizeRequiredId(data.workspaceId, 'Workspace ID');
    const userId = normalizeOptionalId(data.userId, 'User ID');
    const categoryId = normalizeOptionalId(data.categoryId, 'Category ID');
    const limitAmount = parseMoney(data.limitAmount, 'Limit amount');
    const currency = normalizeCurrency(data.currency);
    if (
      !Object.values(BudgetPeriodType).includes(data.periodType) ||
      data.periodType === BudgetPeriodType.CUSTOM
    ) {
      throw new InvalidBudgetPeriodError(
        'Spending limits require a monthly, quarterly, or yearly period',
      );
    }

    const now = new Date();

    const spendingLimit = new SpendingLimit({
      id: SpendingLimitId.create(),
      workspaceId,
      userId,
      categoryId,
      limitAmount,
      currency,
      periodType: data.periodType,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    spendingLimit.addDomainEvent(
      new SpendingLimitCreatedEvent(
        spendingLimit.id.getValue(),
        workspaceId,
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
    return new Date(this.props.createdAt.getTime());
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt.getTime());
  }

  // Business logic methods
  updateLimitAmount(amount: number | string | Decimal): void {
    const newAmount = parseMoney(amount, 'Limit amount');

    const oldAmount = this.props.limitAmount;
    if (oldAmount.equals(newAmount)) return;
    this.props.limitAmount = newAmount;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new SpendingLimitUpdatedEvent(
        this.id.getValue(),
        this.workspaceId,
        oldAmount.toString(),
        newAmount.toString()
      )
    );
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
    return (
      (this.props.userId === null || this.props.userId === userId) &&
      (this.props.categoryId === null || this.props.categoryId === categoryId)
    );
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
