import { randomUUID } from "crypto";

export class PlanId {
  private constructor(private readonly value: string) {
    if (!value || value.trim() === "") {
      throw new Error("PlanId cannot be empty");
    }
    if (!PlanId.isValid(value)) {
      throw new Error("PlanId must be a valid UUID v4");
    }
  }

  static create(): PlanId {
    return new PlanId(randomUUID());
  }

  static fromString(id: string): PlanId {
    return new PlanId(id);
  }

  static isValid(id: string): boolean {
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: PlanId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
