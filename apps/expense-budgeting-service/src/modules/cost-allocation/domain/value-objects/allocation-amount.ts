import Decimal from 'decimal.js';
import { InvalidAllocationAmountError } from "../errors/cost-allocation.errors";

export class AllocationAmount {
  private constructor(private readonly value: Decimal) {}

  static create(amount: number | string | Decimal): AllocationAmount {
    let decimalAmount: Decimal;
    try {
      decimalAmount = new Decimal(amount);
    } catch {
      throw new InvalidAllocationAmountError(Number(amount), 'Amount must be a valid decimal number');
    }

    if (!decimalAmount.isFinite() || decimalAmount.lessThanOrEqualTo(0) ||
        decimalAmount.decimalPlaces() > 2 || decimalAmount.greaterThan('9999999999.99')) {
      throw new InvalidAllocationAmountError(decimalAmount.toNumber());
    }

    return new AllocationAmount(decimalAmount);
  }

  getValue(): Decimal {
    return this.value;
  }

  equals(other: AllocationAmount): boolean {
    return this.value.equals(other.value);
  }

  add(other: AllocationAmount): AllocationAmount {
    return AllocationAmount.create(this.value.add(other.value));
  }
}
