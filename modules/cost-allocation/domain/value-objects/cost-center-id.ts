import { randomUUID } from "crypto";

export class CostCenterId {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  private constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error("CostCenterId cannot be empty");
    }
    if (!CostCenterId.UUID_REGEX.test(value)) {
      throw new Error("CostCenterId must be a valid UUID format");
    }
  }

  static create(): CostCenterId {
    return new CostCenterId(randomUUID());
  }

  static fromString(id: string): CostCenterId {
    return new CostCenterId(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: CostCenterId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
