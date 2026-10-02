import { AllocationId } from '../value-objects/allocation-id';
import { BudgetId } from '../value-objects/budget-id';
import Decimal from 'decimal.js';
import {
  InvalidAlertThresholdError,
  NegativeAmountError,
} from '../errors/budget.errors';
import { BudgetAlert } from './budget-alert.entity';
import { DEFAULT_ALERT_THRESHOLDS } from '../constants/budget.constants';
import { getAlertLevel } from '../enums/alert-level';
import { normalizeDescription, normalizeOptionalId, parseMoney } from './entity-validation';

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
  private lastAlertEvaluationSpent: Decimal;

  private constructor(private props: BudgetAllocationProps) {
    this.props = {
      ...props,
      createdAt: new Date(props.createdAt.getTime()),
      updatedAt: new Date(props.updatedAt.getTime()),
    };
    this.lastAlertEvaluationSpent = props.spentAmount;
  }

  static create(data: CreateBudgetAllocationData): BudgetAllocation {
    // Validate allocated amount
    const allocatedAmount = parseMoney(data.allocatedAmount, 'Allocated amount');
    const description = normalizeDescription(data.description, true);

    const now = new Date();

    const allocation = new BudgetAllocation({
      id: AllocationId.create(),
      budgetId: BudgetId.fromString(data.budgetId),
      categoryId: normalizeOptionalId(data.categoryId, 'Category ID'),
      allocatedAmount,
      spentAmount: new Decimal(0),
      description,
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
    return new Date(this.props.createdAt.getTime());
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt.getTime());
  }

  // Business logic methods
  updateAllocatedAmount(amount: number | string | Decimal): void {
    const newAmount = parseMoney(amount, 'Allocated amount');
    if (this.props.allocatedAmount.equals(newAmount)) return;
    this.props.allocatedAmount = newAmount;
    this.props.updatedAt = new Date();
  }

  updateSpentAmount(amount: number | string | Decimal): void {
    const newAmount = parseMoney(amount, 'Spent amount', {
      allowZero: true,
      storageMaximum: true,
    });
    if (this.props.spentAmount.equals(newAmount)) return;
    this.props.spentAmount = newAmount;
    this.props.updatedAt = new Date();
  }

  incrementSpent(amount: number | string | Decimal): void {
    const incrementAmount = parseMoney(amount, 'Increment amount', {
      storageMaximum: true,
    });
    const newSpentAmount = this.props.spentAmount.add(incrementAmount);
    this.updateSpentAmount(newSpentAmount);
  }

  decrementSpent(amount: number | string | Decimal): void {
    const decrementAmount = parseMoney(amount, 'Decrement amount', {
      storageMaximum: true,
    });
    const newSpent = this.props.spentAmount.sub(decrementAmount);
    if (newSpent.isNegative()) {
      throw new NegativeAmountError(newSpent.toNumber());
    }

    this.updateSpentAmount(newSpent);
  }

  updateDescription(description: string | null): void {
    const normalized = normalizeDescription(description, true);
    if (this.props.description === normalized) return;
    this.props.description = normalized;
    this.props.updatedAt = new Date();
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
    const previousPercentage = this.lastAlertEvaluationSpent
      .div(this.props.allocatedAmount)
      .mul(100)
      .toNumber();
    const percentage = this.getSpentPercentage();
    this.lastAlertEvaluationSpent = this.props.spentAmount;
    if (percentage < DEFAULT_ALERT_THRESHOLDS.INFO) return [];

    const level = getAlertLevel(percentage);
    if (
      previousPercentage >= DEFAULT_ALERT_THRESHOLDS.INFO &&
      level === getAlertLevel(previousPercentage)
    ) {
      return [];
    }

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
