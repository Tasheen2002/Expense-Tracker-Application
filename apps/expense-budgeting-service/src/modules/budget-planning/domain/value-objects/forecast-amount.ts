import Decimal from "decimal.js";
import { PLANNING_CONSTANTS } from "../constants/planning.constants";
import { InvalidForecastAmountError } from "../errors/budget-planning.errors";

export class ForecastAmount {
  private readonly value: Decimal;

  private constructor(value: Decimal) {
    if (value.lessThan(PLANNING_CONSTANTS.MIN_AMOUNT)) {
      throw new InvalidForecastAmountError(
        `ForecastAmount cannot be less than ${PLANNING_CONSTANTS.MIN_AMOUNT}`,
      );
    }
    if (value.greaterThan(PLANNING_CONSTANTS.MAX_AMOUNT)) {
      throw new InvalidForecastAmountError(
        `ForecastAmount cannot be greater than ${PLANNING_CONSTANTS.MAX_AMOUNT}`,
      );
    }
    if (value.decimalPlaces() > 2) {
      throw new InvalidForecastAmountError(
        "ForecastAmount cannot have more than 2 decimal places",
      );
    }
    this.value = value;
  }

  static create(amount: number | string | Decimal | { toString(): string }): ForecastAmount {
    if (
      amount === null ||
      amount === undefined ||
      (typeof amount === "string" && amount.trim() === "")
    ) {
      throw new InvalidForecastAmountError("Forecast amount cannot be empty");
    }

    try {
      const rawString =
        typeof amount === "number"
          ? amount.toString()
          : amount instanceof Decimal
            ? amount.toString()
            : String(amount);

      const decimalAmount = new Decimal(rawString);

      if (decimalAmount.isNaN() || !decimalAmount.isFinite()) {
        throw new InvalidForecastAmountError(`Invalid forecast amount: ${amount}`);
      }

      return new ForecastAmount(decimalAmount);
    } catch (error) {
      if (error instanceof InvalidForecastAmountError) {
        throw error;
      }
      throw new InvalidForecastAmountError(`Invalid forecast amount: ${amount}`);
    }
  }

  static fromRounded(
    amount: number | string | Decimal | { toString(): string },
    roundingMode: Decimal.Rounding = Decimal.ROUND_HALF_UP,
  ): ForecastAmount {
    if (
      amount === null ||
      amount === undefined ||
      (typeof amount === "string" && amount.trim() === "")
    ) {
      throw new InvalidForecastAmountError("Forecast amount cannot be empty");
    }

    try {
      const rawString =
        typeof amount === "number"
          ? amount.toString()
          : amount instanceof Decimal
            ? amount.toString()
            : String(amount);

      const decimalAmount = new Decimal(rawString);

      if (decimalAmount.isNaN() || !decimalAmount.isFinite()) {
        throw new InvalidForecastAmountError(`Invalid forecast amount: ${amount}`);
      }

      const rounded = decimalAmount.toDecimalPlaces(2, roundingMode);
      return new ForecastAmount(rounded);
    } catch (error) {
      if (error instanceof InvalidForecastAmountError) {
        throw error;
      }
      throw new InvalidForecastAmountError(`Invalid forecast amount: ${amount}`);
    }
  }

  getValue(): Decimal {
    return this.value;
  }

  add(other: ForecastAmount): ForecastAmount {
    if (!other || !(other instanceof ForecastAmount)) {
      throw new InvalidForecastAmountError("Cannot add non-ForecastAmount");
    }
    return new ForecastAmount(this.value.plus(other.value));
  }

  subtract(other: ForecastAmount): ForecastAmount {
    if (!other || !(other instanceof ForecastAmount)) {
      throw new InvalidForecastAmountError("Cannot subtract non-ForecastAmount");
    }
    return new ForecastAmount(this.value.minus(other.value));
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isPositive(): boolean {
    return this.value.greaterThan(0);
  }

  isGreaterThan(other: ForecastAmount): boolean {
    if (!other || !(other instanceof ForecastAmount)) {
      throw new InvalidForecastAmountError("Cannot compare with non-ForecastAmount");
    }
    return this.value.greaterThan(other.value);
  }

  isLessThan(other: ForecastAmount): boolean {
    if (!other || !(other instanceof ForecastAmount)) {
      throw new InvalidForecastAmountError("Cannot compare with non-ForecastAmount");
    }
    return this.value.lessThan(other.value);
  }

  equals(other: ForecastAmount | null | undefined): boolean {
    if (!other || !(other instanceof ForecastAmount)) return false;
    return this.value.equals(other.value);
  }

  toString(): string {
    return this.value.toFixed(2);
  }

  toNumber(): number {
    return this.value.toNumber();
  }
}
