import { randomUUID } from "crypto";

export class SplitId {
  private constructor(private readonly value: string) {
    if (!SplitId.isValid(value)) {
      throw new Error(`Invalid SplitId format: ${value}`);
    }
  }

  static create(): SplitId {
    return new SplitId(randomUUID());
  }

  static fromString(id: string): SplitId {
    return new SplitId(id);
  }

  static isValid(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    );
  }

  getValue(): string {
    return this.value;
  }

  equals(other: SplitId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
