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
    this._startDate = startDate;
    this._endDate = endDate;
    this._periodType = periodType;
  }

  static create(
    startDate: Date,
    periodType: BudgetPeriodType,
    customEndDate?: Date,
  ): BudgetPeriod {
    if (periodType === BudgetPeriodType.CUSTOM) {
      if (!customEndDate) {
        throw new InvalidBudgetPeriodError(
          "Custom period requires an explicit end date",
        );
      }
      if (customEndDate <= startDate) {
        throw new InvalidBudgetPeriodError("End date must be after start date");
      }
      return new BudgetPeriod(startDate, customEndDate, periodType);
    }

    const endDate = calculateEndDate(startDate, periodType);
    return new BudgetPeriod(startDate, endDate, periodType);
  }

  static fromDates(
    startDate: Date,
    endDate: Date,
    periodType: BudgetPeriodType,
  ): BudgetPeriod {
    if (endDate <= startDate) {
      throw new InvalidBudgetPeriodError("End date must be after start date");
    }
    return new BudgetPeriod(startDate, endDate, periodType);
  }

  get startDate(): Date {
    return this._startDate;
  }

  get endDate(): Date {
    return this._endDate;
  }

  get periodType(): BudgetPeriodType {
    return this._periodType;
  }

  isActive(currentDate: Date = new Date()): boolean {
    return currentDate >= this.startDate && currentDate <= this.endDate;
  }

  hasStarted(currentDate: Date = new Date()): boolean {
    return currentDate >= this.startDate;
  }

  hasEnded(currentDate: Date = new Date()): boolean {
    return currentDate > this.endDate;
  }

  getDurationInDays(): number {
    const diffTime = Math.abs(
      this.endDate.getTime() - this.startDate.getTime(),
    );
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
