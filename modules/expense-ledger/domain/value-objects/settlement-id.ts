import { randomUUID } from "crypto";

export class SettlementId {
  private constructor(private readonly value: string) {
    if (!SettlementId.isValid(value)) {
      throw new Error(`Invalid SettlementId format: ${value}`);
    }
  }

  static create(): SettlementId {
    return new SettlementId(randomUUID());
  }

  static fromString(id: string): SettlementId {
    return new SettlementId(id);
  }

  static isValid(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    );
  }

  getValue(): string {
    return this.value;
  }

  equals(other: SettlementId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
