import { AllocationId } from "../value-objects/allocation-id";
import { BudgetId } from "../value-objects/budget-id";
import { Decimal } from "@prisma/client/runtime/library";
import {
  InvalidAmountError,
  NegativeAmountError,
} from "../errors/budget.errors";

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

export class BudgetAllocation {
  private constructor(private props: BudgetAllocationProps) {}

  static create(data: CreateBudgetAllocationData): BudgetAllocation {
    // Validate allocated amount
    const allocatedAmount =
      typeof data.allocatedAmount === "number" ||
      typeof data.allocatedAmount === "string"
        ? new Decimal(data.allocatedAmount)
        : data.allocatedAmount;

    if (allocatedAmount.isNegative() || allocatedAmount.isZero()) {
      throw new InvalidAmountError(
        "Allocated amount must be greater than zero",
      );
    }

    if (allocatedAmount.decimalPlaces() > 2) {
      throw new InvalidAmountError(
        "Allocated amount cannot have more than 2 decimal places",
      );
    }

    const now = new Date();

    return new BudgetAllocation({
      id: AllocationId.create(),
      budgetId: BudgetId.fromString(data.budgetId),
      categoryId: data.categoryId || null,
      allocatedAmount,
      spentAmount: new Decimal(0),
      description: data.description?.trim() || null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: BudgetAllocationProps): BudgetAllocation {
    return new BudgetAllocation(props);
  }

  // Getters
  getId(): AllocationId {
    return this.props.id;
  }

  getBudgetId(): BudgetId {
    return this.props.budgetId;
  }

  getCategoryId(): string | null {
    return this.props.categoryId;
  }

  getAllocatedAmount(): Decimal {
    return this.props.allocatedAmount;
  }

  getSpentAmount(): Decimal {
    return this.props.spentAmount;
  }

  getDescription(): string | null {
    return this.props.description;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business logic methods
  updateAllocatedAmount(amount: number | string | Decimal): void {
    const newAmount =
      typeof amount === "number" || typeof amount === "string"
        ? new Decimal(amount)
        : amount;

    if (newAmount.isNegative() || newAmount.isZero()) {
      throw new InvalidAmountError(
        "Allocated amount must be greater than zero",
      );
    }

    if (newAmount.decimalPlaces() > 2) {
      throw new InvalidAmountError(
        "Allocated amount cannot have more than 2 decimal places",
      );
    }

    this.props.allocatedAmount = newAmount;
    this.props.updatedAt = new Date();
  }

  updateSpentAmount(amount: number | string | Decimal): void {
    const newAmount =
      typeof amount === "number" || typeof amount === "string"
        ? new Decimal(amount)
        : amount;

    if (newAmount.isNegative()) {
      throw new NegativeAmountError(newAmount.toNumber());
    }

    if (newAmount.decimalPlaces() > 2) {
      throw new InvalidAmountError(
        "Spent amount cannot have more than 2 decimal places",
      );
    }

    this.props.spentAmount = newAmount;
    this.props.updatedAt = new Date();
  }

  incrementSpent(amount: number | string | Decimal): void {
    const incrementAmount =
      typeof amount === "number" || typeof amount === "string"
        ? new Decimal(amount)
        : amount;

    if (incrementAmount.isNegative() || incrementAmount.isZero()) {
      throw new InvalidAmountError(
        "Increment amount must be greater than zero",
      );
    }

    this.props.spentAmount = this.props.spentAmount.add(incrementAmount);
    this.props.updatedAt = new Date();
  }

  decrementSpent(amount: number | string | Decimal): void {
    const decrementAmount =
      typeof amount === "number" || typeof amount === "string"
        ? new Decimal(amount)
        : amount;

    if (decrementAmount.isNegative() || decrementAmount.isZero()) {
      throw new InvalidAmountError(
        "Decrement amount must be greater than zero",
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
      this.props.allocatedAmount,
    );
  }

  hasAvailableBudget(): boolean {
    return this.props.spentAmount.lessThan(this.props.allocatedAmount);
  }

  equals(other: BudgetAllocation): boolean {
    return this.props.id.equals(other.props.id);
  }
}
