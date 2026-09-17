import { InvalidCodeError } from "../errors/cost-allocation.errors";

export class CostCenterCode {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): CostCenterCode {
    if (!value || typeof value !== "string") {
      throw new InvalidCodeError("Cost Center", "must be a non-empty string");
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidCodeError("Cost Center", "cannot be empty");
    }

    if (trimmed.length > 20) {
      throw new InvalidCodeError("Cost Center", "cannot exceed 20 characters");
    }

    // Only allow alphanumeric, hyphens, and underscores
    if (!/^[A-Z0-9\-_]+$/i.test(trimmed)) {
      throw new InvalidCodeError(
        "Cost Center",
        "can only contain letters, numbers, hyphens, and underscores",
      );
    }

    return new CostCenterCode(trimmed.toUpperCase());
  }

  get value(): string {
    return this._value;
  }

  equals(other: CostCenterCode): boolean {
    if (!other) return false;
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
