import { InvalidExpenseDateError } from "../errors/expense.errors";
import { MAX_EXPENSE_DATE_PAST_YEARS } from "../constants/expense.constants";

export class ExpenseDate {
  private readonly value: Date;

  private constructor(value: Date) {
    this.value = new Date(value.getTime());
  }

  static create(date: Date | string): ExpenseDate {
    const parsedDate = typeof date === "string" ? new Date(date) : date;

    if (isNaN(parsedDate.getTime())) {
      throw new InvalidExpenseDateError("format is invalid");
    }

    // Allow 5 minutes clock-skew leeway for distributed client clocks
    const now = new Date();
    const futureGraceMs = 5 * 60 * 1000;
    if (parsedDate.getTime() > now.getTime() + futureGraceMs) {
      throw new InvalidExpenseDateError("cannot be in the future");
    }

    // Ensure date is not older than allowed threshold (10 years)
    const minAllowedDate = new Date();
    minAllowedDate.setFullYear(minAllowedDate.getFullYear() - MAX_EXPENSE_DATE_PAST_YEARS);
    if (parsedDate < minAllowedDate) {
      throw new InvalidExpenseDateError(
        `cannot be older than ${MAX_EXPENSE_DATE_PAST_YEARS} years`
      );
    }

    return new ExpenseDate(parsedDate);
  }

  static fromPersistence(date: Date | string): ExpenseDate {
    const parsedDate = typeof date === "string" ? new Date(date) : date;

    if (isNaN(parsedDate.getTime())) {
      throw new InvalidExpenseDateError("format is invalid");
    }

    return new ExpenseDate(parsedDate);
  }

  static today(): ExpenseDate {
    return new ExpenseDate(new Date());
  }

  getValue(): Date {
    return new Date(this.value.getTime());
  }

  isBefore(other: ExpenseDate): boolean {
    return this.value < other.value;
  }

  isAfter(other: ExpenseDate): boolean {
    return this.value > other.value;
  }

  equals(other: ExpenseDate): boolean {
    return this.value.getTime() === other.value.getTime();
  }

  toString(): string {
    return this.value.toISOString();
  }

  toDateString(): string {
    return this.value.toISOString().split("T")[0];
  }
}
