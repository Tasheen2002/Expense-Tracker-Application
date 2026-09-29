import {
  BudgetPeriodType,
  calculateEndDate,
} from "../enums/budget-period-type";
import { InvalidBudgetPeriodError } from "../errors/budget.errors";

export class BudgetPeriod {
  private readonly _startDate: Date;
  private readonly _endDate: Date;
  private readonly _periodType: BudgetPeriodType;

  private constructor(
    startDate: Date,
    endDate: Date,
    periodType: BudgetPeriodType,
  ) {
    this._startDate = BudgetPeriod.toUtcDate(startDate);
    this._endDate = BudgetPeriod.toUtcDate(endDate);
    this._periodType = periodType;
  }

  private static toUtcDate(date: Date): Date {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
      throw new InvalidBudgetPeriodError("Dates must be valid");
    }
    const normalized = new Date(date.getTime());
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  }

  private static validateType(periodType: BudgetPeriodType): void {
    if (!Object.values(BudgetPeriodType).includes(periodType)) {
      throw new InvalidBudgetPeriodError("Unsupported budget period type");
    }
  }

  static create(
    startDate: Date,
    periodType: BudgetPeriodType,
    customEndDate?: Date,
  ): BudgetPeriod {
    BudgetPeriod.validateType(periodType);
    const normalizedStart = BudgetPeriod.toUtcDate(startDate);

    if (periodType === BudgetPeriodType.CUSTOM) {
      if (customEndDate === undefined) {
        throw new InvalidBudgetPeriodError(
          "Custom period requires an explicit end date",
        );
      }
      const normalizedEnd = BudgetPeriod.toUtcDate(customEndDate);
      if (normalizedEnd < normalizedStart) {
        throw new InvalidBudgetPeriodError("End date must not precede start date");
      }
      return new BudgetPeriod(normalizedStart, normalizedEnd, periodType);
    }

    if (customEndDate !== undefined) {
      throw new InvalidBudgetPeriodError(
        "An explicit end date is only supported for custom periods",
      );
    }

    const endDate = calculateEndDate(normalizedStart, periodType);
    return new BudgetPeriod(normalizedStart, endDate, periodType);
  }

  static fromDates(
    startDate: Date,
    endDate: Date,
    periodType: BudgetPeriodType,
  ): BudgetPeriod {
    BudgetPeriod.validateType(periodType);
    const normalizedStart = BudgetPeriod.toUtcDate(startDate);
    const normalizedEnd = BudgetPeriod.toUtcDate(endDate);
    if (normalizedEnd < normalizedStart) {
      throw new InvalidBudgetPeriodError("End date must not precede start date");
    }
    return new BudgetPeriod(normalizedStart, normalizedEnd, periodType);
  }

  get startDate(): Date {
    return new Date(this._startDate.getTime());
  }

  get endDate(): Date {
    return new Date(this._endDate.getTime());
  }

  get periodType(): BudgetPeriodType {
    return this._periodType;
  }

  isActive(currentDate: Date = new Date()): boolean {
    const today = BudgetPeriod.toUtcDate(currentDate);
    return today >= this._startDate && today <= this._endDate;
  }

  hasStarted(currentDate: Date = new Date()): boolean {
    return BudgetPeriod.toUtcDate(currentDate) >= this._startDate;
  }

  hasEnded(currentDate: Date = new Date()): boolean {
    return BudgetPeriod.toUtcDate(currentDate) > this._endDate;
  }

  getDurationInDays(): number {
    return (this._endDate.getTime() - this._startDate.getTime()) / 86_400_000 + 1;
  }

  equals(other: BudgetPeriod): boolean {
    return (
      this.startDate.getTime() === other.startDate.getTime() &&
      this.endDate.getTime() === other.endDate.getTime() &&
      this.periodType === other.periodType
    );
  }

  toString(): string {
    return `${this.periodType}: ${this.startDate.toISOString().split("T")[0]} to ${this.endDate.toISOString().split("T")[0]}`;
  }
}
