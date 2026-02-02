import { SpendingLimitId } from "../value-objects/spending-limit-id";
import { BudgetPeriodType } from "../enums/budget-period-type";
import { Decimal } from "@prisma/client/runtime/library";
import {
  InvalidAmountError,
  InvalidCurrencyError,
  BudgetAlreadyActiveError,
  InvalidBudgetStatusError,
} from "../errors/budget.errors";

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

export class SpendingLimit {
  private constructor(private props: SpendingLimitProps) {}

  static create(data: CreateSpendingLimitData): SpendingLimit {
    // Validate limit amount
    const limitAmount =
      typeof data.limitAmount === "number" ||
      typeof data.limitAmount === "string"
        ? new Decimal(data.limitAmount)
        : data.limitAmount;

    // ...
    if (limitAmount.isNegative() || limitAmount.isZero()) {
      throw new InvalidAmountError("Limit amount must be greater than zero");
    }

    if (limitAmount.decimalPlaces() > 2) {
      throw new InvalidAmountError(
        "Limit amount cannot have more than 2 decimal places",
      );
    }

    // Validate currency
    if (!data.currency || data.currency.length !== 3) {
      throw new InvalidCurrencyError(
        "Currency must be a valid 3-letter ISO code",
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

    return spendingLimit;
  }

  static fromPersistence(props: SpendingLimitProps): SpendingLimit {
    return new SpendingLimit(props);
  }

  // Getters
  getId(): SpendingLimitId {
    return this.props.id;
  }

  getWorkspaceId(): string {
    return this.props.workspaceId;
  }

  getUserId(): string | null {
    return this.props.userId;
  }

  getCategoryId(): string | null {
    return this.props.categoryId;
  }

  getLimitAmount(): Decimal {
    return this.props.limitAmount;
  }

  getCurrency(): string {
    return this.props.currency;
  }

  getPeriodType(): BudgetPeriodType {
    return this.props.periodType;
  }

  isActive(): boolean {
    return this.props.isActive;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business logic methods
  updateLimitAmount(amount: number | string | Decimal): void {
    const newAmount =
      typeof amount === "number" || typeof amount === "string"
        ? new Decimal(amount)
        : amount;

    if (newAmount.isNegative() || newAmount.isZero()) {
      throw new InvalidAmountError("Limit amount must be greater than zero");
    }

    if (newAmount.decimalPlaces() > 2) {
      throw new InvalidAmountError(
        "Limit amount cannot have more than 2 decimal places",
      );
    }

    this.props.limitAmount = newAmount;
    this.props.updatedAt = new Date();
  }

  // ...

  activate(): void {
    if (this.props.isActive) {
      throw new BudgetAlreadyActiveError("Spending limit is already active");
    }
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    if (!this.props.isActive) {
      throw new InvalidBudgetStatusError("INACTIVE", "INACTIVE");
    }
    this.props.isActive = false;
    this.props.updatedAt = new Date();
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
}
