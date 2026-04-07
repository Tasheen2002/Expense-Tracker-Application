import { AllocationId } from '../value-objects/allocation-id';
import { BudgetId } from '../value-objects/budget-id';
import { Decimal } from '@prisma/client/runtime/library';
import {
  InvalidAmountError,
  InvalidAlertThresholdError,
  NegativeAmountError,
} from '../errors/budget.errors';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';
import { BudgetAlert } from './budget-alert.entity';

// ============================================================================
// Domain Events
// ============================================================================

export class BudgetAllocationCreatedEvent extends DomainEvent {
  constructor(
    public readonly allocationId: string,
    public readonly budgetId: string,
    public readonly categoryId: string | null,
    public readonly allocatedAmount: string
  ) {
    super(allocationId, 'BudgetAllocation');
  }

  get eventType(): string {
    return 'budget-allocation.created';
  }

  getPayload(): Record<string, unknown> {
    return {
      allocationId: this.allocationId,
      budgetId: this.budgetId,
      categoryId: this.categoryId,
      allocatedAmount: this.allocatedAmount,
    };
  }
}

export class BudgetAllocationUpdatedEvent extends DomainEvent {
  constructor(
    public readonly allocationId: string,
    public readonly budgetId: string,
    public readonly changes: {
      allocatedAmount?: string;
      description?: string | null;
    }
  ) {
    super(allocationId, 'BudgetAllocation');
  }

  get eventType(): string {
    return 'budget-allocation.updated';
  }

  getPayload(): Record<string, unknown> {
    return {
      allocationId: this.allocationId,
      budgetId: this.budgetId,
      changes: this.changes,
    };
  }
}

export class BudgetSpentIncrementedEvent extends DomainEvent {
  constructor(
    public readonly allocationId: string,
    public readonly budgetId: string,
    public readonly incrementAmount: string,
    public readonly newSpentAmount: string
  ) {
    super(allocationId, 'BudgetAllocation');
  }

  get eventType(): string {
    return 'budget-allocation.spent-incremented';
  }

  getPayload(): Record<string, unknown> {
    return {
      allocationId: this.allocationId,
      budgetId: this.budgetId,
      incrementAmount: this.incrementAmount,
      newSpentAmount: this.newSpentAmount,
    };
  }
}

export class BudgetSpentDecrementedEvent extends DomainEvent {
  constructor(
    public readonly allocationId: string,
    public readonly budgetId: string,
    public readonly decrementAmount: string,
    public readonly newSpentAmount: string
  ) {
    super(allocationId, 'BudgetAllocation');
  }

  get eventType(): string {
    return 'budget-allocation.spent-decremented';
  }

  getPayload(): Record<string, unknown> {
    return {
      allocationId: this.allocationId,
      budgetId: this.budgetId,
      decrementAmount: this.decrementAmount,
      newSpentAmount: this.newSpentAmount,
    };
  }
}

export class BudgetAllocationDeletedEvent extends DomainEvent {
  constructor(
    public readonly allocationId: string,
    public readonly budgetId: string
  ) {
    super(allocationId, 'BudgetAllocation');
  }

  get eventType(): string {
    return 'budget-allocation.deleted';
  }

  getPayload(): Record<string, unknown> {
    return {
      allocationId: this.allocationId,
      budgetId: this.budgetId,
    };
  }
}

export interface BudgetAllocationProps {
  id: AllocationId;
  budgetId: BudgetId;
  categoryId: string | null;
  allocatedAmount: Decimal;
  spentAmount: Decimal;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBudgetAllocationData {
  budgetId: string;
  categoryId?: string;
  allocatedAmount: number | string | Decimal;
  description?: string;
}

export interface BudgetAllocationDTO {
  allocationId: string;
  budgetId: string;
  categoryId: string | null;
  allocatedAmount: string;
  spentAmount: string;
  description: string | null;
  remainingAmount: string;
  spentPercentage: number;
  isOverBudget: boolean;
  createdAt: string;
  updatedAt: string;
}

export class BudgetAllocation {
  private constructor(private props: BudgetAllocationProps) {
  }

  static create(data: CreateBudgetAllocationData): BudgetAllocation {
    // Validate allocated amount
    const allocatedAmount =
      typeof data.allocatedAmount === 'number' ||
      typeof data.allocatedAmount === 'string'
        ? new Decimal(data.allocatedAmount)
        : data.allocatedAmount;

    if (allocatedAmount.isNegative() || allocatedAmount.isZero()) {
      throw new InvalidAmountError(
        'Allocated amount must be greater than zero'
      );
    }

    if (allocatedAmount.decimalPlaces() > 2) {
      throw new InvalidAmountError(
        'Allocated amount cannot have more than 2 decimal places'
      );
    }

    const now = new Date();

    const allocation = new BudgetAllocation({
      id: AllocationId.create(),
      budgetId: BudgetId.fromString(data.budgetId),
      categoryId: data.categoryId || null,
      allocatedAmount,
      spentAmount: new Decimal(0),
      description: data.description?.trim() || null,
      createdAt: now,
      updatedAt: now,
    });

    return allocation;
  }

  static fromPersistence(props: BudgetAllocationProps): BudgetAllocation {
    return new BudgetAllocation(props);
  }

  // Getters
  get id(): AllocationId {
    return this.props.id;
  }

  get budgetId(): BudgetId {
    return this.props.budgetId;
  }

  get categoryId(): string | null {
    return this.props.categoryId;
  }

  get allocatedAmount(): Decimal {
    return this.props.allocatedAmount;
  }

  get spentAmount(): Decimal {
    return this.props.spentAmount;
  }

  get description(): string | null {
    return this.props.description;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business logic methods
  updateAllocatedAmount(amount: number | string | Decimal): void {
    const newAmount =
      typeof amount === 'number' || typeof amount === 'string'
        ? new Decimal(amount)
        : amount;

    if (newAmount.isNegative() || newAmount.isZero()) {
      throw new InvalidAmountError(
        'Allocated amount must be greater than zero'
      );
    }

    if (newAmount.decimalPlaces() > 2) {
      throw new InvalidAmountError(
        'Allocated amount cannot have more than 2 decimal places'
      );
    }

    this.props.allocatedAmount = newAmount;
    this.props.updatedAt = new Date();

  }

  updateSpentAmount(amount: number | string | Decimal): void {
    const newAmount =
      typeof amount === 'number' || typeof amount === 'string'
        ? new Decimal(amount)
        : amount;

    if (newAmount.isNegative()) {
      throw new NegativeAmountError(newAmount.toNumber());
    }

    if (newAmount.decimalPlaces() > 2) {
      throw new InvalidAmountError(
        'Spent amount cannot have more than 2 decimal places'
      );
    }

    this.props.spentAmount = newAmount;
    this.props.updatedAt = new Date();
  }

  incrementSpent(amount: number | string | Decimal): void {
    const incrementAmount =
      typeof amount === 'number' || typeof amount === 'string'
        ? new Decimal(amount)
        : amount;

    if (incrementAmount.isNegative() || incrementAmount.isZero()) {
      throw new InvalidAmountError(
        'Increment amount must be greater than zero'
      );
    }

    const newSpentAmount = this.props.spentAmount.add(incrementAmount);
    this.props.spentAmount = newSpentAmount;
    this.props.updatedAt = new Date();
  }

  decrementSpent(amount: number | string | Decimal): void {
    const decrementAmount =
      typeof amount === 'number' || typeof amount === 'string'
        ? new Decimal(amount)
        : amount;

    if (decrementAmount.isNegative() || decrementAmount.isZero()) {
      throw new InvalidAmountError(
        'Decrement amount must be greater than zero'
      );
    }

    const newSpent = this.props.spentAmount.sub(decrementAmount);
    if (newSpent.isNegative()) {
      throw new NegativeAmountError(newSpent.toNumber());
    }

    this.props.spentAmount = newSpent;
    this.props.updatedAt = new Date();
  }

  updateDescription(description: string | null): void {
    this.props.description = description?.trim() || null;
    this.props.updatedAt = new Date();
  }

  markAsDeleted(): void {
  }

  getRemainingAmount(): Decimal {
    return this.props.allocatedAmount.sub(this.props.spentAmount);
  }

  getSpentPercentage(): number {
    if (this.props.allocatedAmount.isZero()) {
      return 0;
    }
    return this.props.spentAmount
      .div(this.props.allocatedAmount)
      .mul(100)
      .toNumber();
  }

  isOverBudget(): boolean {
    return this.props.spentAmount.greaterThan(this.props.allocatedAmount);
  }

  isFullySpent(): boolean {
    return this.props.spentAmount.greaterThanOrEqualTo(
      this.props.allocatedAmount
    );
  }

  hasAvailableBudget(): boolean {
    return this.props.spentAmount.lessThan(this.props.allocatedAmount);
  }

  equals(other: BudgetAllocation): boolean {
    return this.props.id.equals(other.props.id);
  }

  collectTriggeredAlerts(): BudgetAlert[] {
    const percentage = this.getSpentPercentage();
    if (percentage < 50) return [];

    try {
      const alert = BudgetAlert.create({
        budgetId: this.budgetId.getValue(),
        allocationId: this.id.getValue(),
        currentSpent: this.spentAmount,
        allocatedAmount: this.allocatedAmount,
      });
      return [alert];
    } catch (error) {
      if (!(error instanceof InvalidAlertThresholdError)) {
        throw error;
      }
      return [];
    }
  }

  static toDTO(allocation: BudgetAllocation): BudgetAllocationDTO {
    return {
      allocationId: allocation.id.getValue(),
      budgetId: allocation.budgetId.getValue(),
      categoryId: allocation.categoryId,
      allocatedAmount: allocation.allocatedAmount.toString(),
      spentAmount: allocation.spentAmount.toString(),
      description: allocation.description,
      remainingAmount: allocation.getRemainingAmount().toString(),
      spentPercentage: allocation.getSpentPercentage(),
      isOverBudget: allocation.isOverBudget(),
      createdAt: allocation.createdAt.toISOString(),
      updatedAt: allocation.updatedAt.toISOString(),
    };
  }

}
