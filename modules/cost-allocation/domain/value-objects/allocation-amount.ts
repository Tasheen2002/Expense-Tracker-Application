import { Decimal } from "@prisma/client/runtime/library";
import { InvalidAllocationAmountError } from "../errors/cost-allocation.errors";

export class AllocationAmount {
  private constructor(private readonly value: Decimal) {}

  static create(amount: number | string | Decimal): AllocationAmount {
    const decimalAmount = new Decimal(amount);

    if (decimalAmount.lessThanOrEqualTo(0)) {
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
    return new AllocationAmount(this.value.add(other.value));
  }
}
