import { Decimal } from "@prisma/client/runtime/library";
import { PLANNING_CONSTANTS } from "../constants/planning.constants";
import { InvalidForecastAmountError } from "../errors/budget-planning.errors";

export class ForecastAmount {
  private constructor(private readonly value: Decimal) {
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
  }

  static create(amount: number | string | Decimal): ForecastAmount {
    const decimalAmount = new Decimal(amount);
    return new ForecastAmount(decimalAmount);
  }

  getValue(): Decimal {
    return this.value;
  }

  add(other: ForecastAmount): ForecastAmount {
    return new ForecastAmount(this.value.add(other.value));
  }

  subtract(other: ForecastAmount): ForecastAmount {
    return new ForecastAmount(this.value.sub(other.value));
  }

  equals(other: ForecastAmount): boolean {
    return this.value.equals(other.value);
  }

  toString(): string {
    return this.value.toFixed(2);
  }

  toNumber(): number {
    return this.value.toNumber();
  }
}
